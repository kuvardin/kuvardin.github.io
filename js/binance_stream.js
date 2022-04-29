class BinanceStream
{
    static Error = class {
        /**
         * @type {int}
         */
        code;

        /**
         * @type {string}
         */
        message;

        /**
         * @type {int|null}
         */
        id;

        /**
         * @param {Map} data
         */
        constructor(data) {
            this.code = data['code'];
            this.message = data['msg'];
            this.id = data.has('id') ? data['id'] : null;
        }
    }

    static Kline = class {
        static INTERVAL_1_MINUTE = '1m';
        static INTERVAL_3_MINUTES = '3m';
        static INTERVAL_5_MINUTES = '5m';
        static INTERVAL_15_MINUTES = '15m';
        static INTERVAL_30_MINUTES = '30m';

        static INTERVAL_1_HOUR = '1h';
        static INTERVAL_2_HOURS = '2h';
        static INTERVAL_4_HOURS = '4h';
        static INTERVAL_6_HOURS = '6h';
        static INTERVAL_8_HOURS = '8h';
        static INTERVAL_12_HOURS = '12h';

        static INTERVAL_1_DAY = '1d';
        static INTERVAL_3_DAYS = '3d';

        static INTERVAL_1_WEEK = '1w';
        static INTERVAL_1_MONTH = '1M';

        /**
         * @param {string} interval
         * @return {boolean}
         */
        static checkInterval(interval)
        {
            return interval === BinanceStream.Kline.INTERVAL_1_MINUTE ||
                interval === BinanceStream.Kline.INTERVAL_3_MINUTES ||
                interval === BinanceStream.Kline.INTERVAL_5_MINUTES ||
                interval === BinanceStream.Kline.INTERVAL_15_MINUTES ||
                interval === BinanceStream.Kline.INTERVAL_30_MINUTES ||
                interval === BinanceStream.Kline.INTERVAL_1_HOUR ||
                interval === BinanceStream.Kline.INTERVAL_2_HOURS ||
                interval === BinanceStream.Kline.INTERVAL_4_HOURS ||
                interval === BinanceStream.Kline.INTERVAL_6_HOURS ||
                interval === BinanceStream.Kline.INTERVAL_8_HOURS ||
                interval === BinanceStream.Kline.INTERVAL_12_HOURS ||
                interval === BinanceStream.Kline.INTERVAL_1_DAY ||
                interval === BinanceStream.Kline.INTERVAL_3_DAYS ||
                interval === BinanceStream.Kline.INTERVAL_1_WEEK ||
                interval === BinanceStream.Kline.INTERVAL_1_MONTH;
        }
    }

    static Stream = class {
        static AGG_TRADE = 'aggTrade';
        static TRADE = 'trade';
        static KLINE = 'kline';
        static MINI_TICKER = 'miniTicker';
        static ALL_MARKET_MINI_TICKERS = '!miniTicker@arr';
        static TICKER = 'ticker';
        static ALL_MARKET_TICKERS = '!ticker@arr';
        static BOOK_TICKER = 'bookTicker';
        static ALL_BOOK_TICKERS = '!bookTicker';
        static DEPTH_UPDATE = 'depthUpdate';
        static DEPTH = 'depth';

        /**
         * @type {string|null} Market symbol
         */
        symbol;

        /**
         * @type {string}
         */
        dataType;

        /**
         * @type {string|null}
         */
        klineInterval = null;

        /**
         * Valid levels are 5, 10, or 20.
         * @type {int|null}
         */
        depthLevels = null;

        /**
         * Update speed in milliseconds
         * @type {int|null}
         */
        updateSpeed = null;

        /**
         * @param {string|null} symbol
         * @param {string} dataType
         */
        constructor(symbol, dataType) {
            this.symbol = symbol;
            this.dataType = dataType;
        }

        /**
         * @param {string} streamString
         * @return BinanceStream.Stream
         */
        static parseString(streamString)
        {
            if (streamString === BinanceStream.Stream.ALL_MARKET_TICKERS) {
                return BinanceStream.Stream.allMarketTickers();
            }

            if (streamString === BinanceStream.Stream.ALL_MARKET_MINI_TICKERS) {
                return BinanceStream.Stream.allMarketMiniTickers();
            }

            if (streamString === BinanceStream.Stream.ALL_BOOK_TICKERS) {
                return BinanceStream.Stream.allBookTickers();
            }

            const stringParts = streamString.split('@');
            const symbol = stringParts[0];
            const dataType = stringParts[1];

            // console.log(streamString);
            if (dataType === BinanceStream.Stream.DEPTH_UPDATE) {
            }

            if (dataType === BinanceStream.Stream.KLINE) {

            }

            return new BinanceStream.Stream(symbol, dataType);
        }

        /**
         * The Aggregate Trade Streams push trade information that is aggregated for a single taker order.<br>
         * <b>Update Speed:</b> Real-time
         *
         * @param {string} symbol
         * @return {BinanceStream.Stream}
         */
        static aggTrade(symbol)
        {
            return new BinanceStream.Stream(symbol, BinanceStream.Stream.AGG_TRADE);
        }

        /**
         * The Trade Streams push raw trade information; each trade has a unique buyer and seller.<br>
         * <b>Update Speed:</b> Real-time
         *
         * @param {string} symbol
         * @return {BinanceStream.Stream}
         */
        static trade(symbol)
        {
            return new BinanceStream.Stream(symbol, BinanceStream.Stream.TRADE);
        }

        /**
         * The Kline/Candlestick Stream push updates to the current klines/candlestick every second.<br>
         * <b>Update Speed:</b> 2000ms
         *
         * @param {string} symbol
         * @param {string} interval One of BinanceStream.Kline.INTERVAL_*
         * @return {BinanceStream.Stream}
         */
        static kline(symbol, interval)
        {
            if (!BinanceStream.Kline.checkInterval(interval)) {
                throw new Error('Incorrect kline interval: ' + interval);
            }

            let result = new BinanceStream.Stream(symbol, BinanceStream.Stream.KLINE);
            result.klineInterval = interval;
            return result;
        }

        /**
         * 24hr rolling window mini-ticker statistics. These are NOT the statistics of the UTC day, but a 24hr rolling
         * window for the previous 24hrs.<br>
         * <b>Update Speed:</b> 1000ms
         *
         * @param {string} symbol
         * @return {BinanceStream.Stream}
         */
        static miniTicker(symbol)
        {
            return new BinanceStream.Stream(symbol, BinanceStream.Stream.MINI_TICKER);
        }

        /**
         * 24hr rolling window mini-ticker statistics for all symbols that changed in an array. These are NOT the statistics
         * of the UTC day, but a 24hr rolling window for the previous 24hrs. Note that only tickers that have changed will
         * be present in the array.<br>
         * <b>Update Speed:</b> 1000ms
         *
         * @return {BinanceStream.Stream}
         */
        static allMarketMiniTickers()
        {
            return new BinanceStream.Stream(null, BinanceStream.Stream.ALL_MARKET_MINI_TICKERS);
        }

        /**
         * 24hr rolling window ticker statistics for a single symbol. These are NOT the statistics of the UTC day,
         * but a 24hr rolling window for the previous 24hrs.<br>
         * <b>Update Speed:</b> 1000ms
         *
         * @param {string} symbol
         * @return {BinanceStream.Stream}
         */
        static ticker(symbol)
        {
            return new BinanceStream.Stream(symbol, BinanceStream.Stream.TICKER);
        }

        /**
         * 24hr rolling window ticker statistics for all symbols that changed in an array. These are NOT the statistics
         * of the UTC day, but a 24hr rolling window for the previous 24hrs. Note that only tickers that have changed
         * will be present in the array.<br>
         * <b>Update Speed:</b> 1000ms
         *
         * @return {BinanceStream.Stream}
         */
        static allMarketTickers()
        {
            return new BinanceStream.Stream(null, BinanceStream.Stream.ALL_MARKET_TICKERS);
        }

        /**
         * Pushes any update to the best bid or ask's price or quantity in real-time for a specified symbol.<br>
         * <b>Update Speed:</b> Real-time
         *
         * @param {string} symbol
         * @return {BinanceStream.Stream}
         */
        static bookTicker(symbol)
        {
            return new BinanceStream.Stream(symbol, BinanceStream.Stream.BOOK_TICKER);
        }

        /**
         * Pushes any update to the best bid or ask's price or quantity in real-time for all symbols.<br>
         * <b>Update Speed:<b> Real-time
         *
         * @return {BinanceStream.Stream}
         */
        static allBookTickers()
        {
            return new BinanceStream.Stream(null, BinanceStream.Stream.ALL_BOOK_TICKERS);
        }

        /**
         * Top <levels> bids and asks, pushed every second. Valid <levels> are 5, 10, or 20.<br>
         * <b>Update Speed:</b> 1000ms or 100ms
         *
         * @param {string} symbol
         * @param {int} levels
         * @param {int|null} updateSpeed
         * @return {BinanceStream.Stream}
         */
        static depthUpdate(symbol, levels, updateSpeed = null)
        {
            if (levels !== 5 && levels !== 10 && levels !== 20) {
                throw new Error('Incorrect partial depth levels: ' + levels);
            }

            if (updateSpeed !== null && updateSpeed !== 100 && updateSpeed !== 1000) {
                throw new Error('Incorrect update speed: ' + updateSpeed);
            }

            let result = new BinanceStream.Stream(symbol, BinanceStream.Stream.DEPTH_UPDATE);
            result.depthLevels = levels;
            result.updateSpeed = updateSpeed;
            return result;
        }


        /**
         * Order book price and quantity depth updates used to locally manage an order book.<br>
         * <b>Update Speed:</b> 1000ms or 100ms
         *
         * @param {string} symbol
         * @param {int|null} updateSpeed
         * @return {BinanceStream.Stream}
         */
        static depth(symbol, updateSpeed = null)
        {
            if (updateSpeed !== null && updateSpeed !== 100 && updateSpeed !== 1000) {
                throw new Error('Incorrect update speed: ' + updateSpeed);
            }

            let result = new BinanceStream.Stream(symbol, BinanceStream.Stream.DEPTH);
            result.updateSpeed = updateSpeed;
            return result;
        }

        toString()
        {
            if (this.dataType === BinanceStream.Stream.ALL_MARKET_MINI_TICKERS ||
                this.dataType === BinanceStream.Stream.ALL_MARKET_TICKERS ||
                this.dataType === BinanceStream.Stream.ALL_BOOK_TICKERS) {
                return this.dataType;
            }

            let result = this.symbol.toLowerCase() + '@';
            if (this.dataType === BinanceStream.Stream.DEPTH_UPDATE) {
                result += BinanceStream.Stream.DEPTH + this.depthLevels;
            } else if (this.dataType === BinanceStream.Stream.KLINE) {
                result += this.dataType + '_' + this.klineInterval;
            } else {
                result += this.dataType;
            }

            if (this.updateSpeed !== null) {
                result += '@' + this.updateSpeed + 'ms';
            }

            return result;
        }
    }

    static Socket = class {
        /**
         * @type {WebSocket}
         */
        socket;

        /**
         * Subscribed streams
         *
         * @type {BinanceStream.Stream[]}
         */
        streams = [];

        /**
         * @param {function(BinanceStream.Message)} onmessage
         */
        constructor(onmessage) {
            this.socket = new WebSocket('wss://stream.binance.com/stream');

            this.socket.onmessage = function (message) {
                const dataDecoded = JSON.parse(message.data);
                if (dataDecoded.hasOwnProperty('stream')) {
                    const messageParsed = new BinanceStream.Message(dataDecoded);
                    // console.log(messageParsed.streamString);
                    onmessage(messageParsed);
                } else {
                    console.log(dataDecoded);
                }
            }


        }

        /**
         * Subscribe to a stream
         *
         * @param {BinanceStream.Stream[]} streams
         * @param {int|null} id The id used in the JSON payloads is an unsigned INT used as an identifier to uniquely
         * identify the messages going back and forth.
         */
        subscribe(streams, id = null)
        {
            if (id == null) {
                id = Math.floor(Math.random() * 10000);
            }

            let params = [];
            streams.forEach(stream => {
                console.log('Trying to subscribe: ' + stream.toString())
                params.push(stream.toString());
                this.streams.push(stream);
            });

            this.socket.send(JSON.stringify({
                method: "SUBSCRIBE",
                params: params,
                id: id
            }));
        }

        /**
         * Unsubscribe to a stream
         *
         * @param {BinanceStream.Stream[]} streams
         * @param {int|null} id The id used in the JSON payloads is an unsigned INT used as an identifier to uniquely
         * identify the messages going back and forth.
         */
        unsubscribe(streams, id = null)
        {
            if (id == null) {
                id = Math.floor(Math.random() * 10000);
            }

            let params = [];
            streams.forEach(function (stream) {
                console.log('Trying to unsubscribe: ' + stream.toString())
                params.push(stream.toString());
            });

            this.socket.send(JSON.stringify({
                method: "UNSUBSCRIBE",
                params: params,
                id: id
            }));
        }

        /**
         * @param {int|null} id
         * @return {boolean}
         */
        unsubscribeAll(id = null)
        {
            if (this.streams.length) {
                this.unsubscribe(this.streams, id);
                return true;
            }

            return false;
        }
    }

    static Trade = class {
        //   "e": "trade",     // Event type
        //   "E": 123456789,   // Event time
        //   "s": "BNBBTC",    // Symbol
        //   "t": 12345,       // Trade ID
        //   "p": "0.001",     // Price
        //   "q": "100",       // Quantity
        //   "b": 88,          // Buyer order ID
        //   "a": 50,          // Seller order ID
        //   "T": 123456785,   // Trade time
        //   "m": true,        // Is the buyer the market maker?
        //   "M": true         // Ignore

        static EVENT_TYPE = 'trade';

        /**
         * Event timestamp (example: 1648230942204)
         *
         * @type {int}
         */
        eventTime;

        /**
         * Symbol in uppercase (example: BNBBTC)
         *
         * @type {string}
         */
        symbol;

        /**
         * Trade ID (example: 1304486947)
         *
         * @type {int}
         */
        tradeId;

        /**
         * Price. Numeric string (example: "44237.63000000")
         *
         * @type {string}
         */
        priceString;

        /**
         * Price in float
         *
         * @type {number}
         */
        price;


        /**
         * Quantity. Numeric string (example: "0.00331000")
         *
         * @type {string}
         */
        quantityString;

        /**
         * Quantity in float
         *
         * @type {number}
         */
        quantity;

        /**
         * Amount sum in float
         *
         * @type {number}
         */
        amount;

        /**
         * Buyer order ID (example: 9966548584)
         *
         * @type {int}
         */
        buyerOrderId;

        /**
         * Seller order ID (example: 9966548937)
         *
         * @type {int}
         */
        sellerOrderId;

        /**
         * Trade timestamp (example: 1648230942203)
         *
         * @type {int}
         */
        tradeTime;

        /**
         * Is the buyer the market maker? (true - selling; false - buying)
         *
         * @type {boolean}
         */
        buyerIsMarketMaker;

        /**
         * @param {object} data
         */
        constructor(data) {
            if (data['e'] !== BinanceStream.Trade.EVENT_TYPE) {
                throw new Error(`Incorrect trade event type: ${data['e']}`);
            }

            this.eventTime = data['E'];
            this.symbol = data['s'];
            this.tradeId = data['t'];
            this.priceString = data['p'];
            this.quantityString = data['q'];
            this.buyerOrderId = data['b'];
            this.sellerOrderId = data['a'];
            this.tradeTime = data['T'];
            this.buyerIsMarketMaker = data['m'];

            this.price = parseFloat(this.priceString);
            this.quantity = parseFloat(this.quantityString);
            this.amount = this.price * this.quantity;
        }

        /**
         * @return {boolean}
         */
        isBuy()
        {
            return !this.buyerIsMarketMaker;
        }
    }

    static DepthUpdate = class {
        //   "e": "depthUpdate", // Event type
        //   "E": 123456789,     // Event time
        //   "s": "BNBBTC",      // Symbol
        //   "U": 157,           // First update ID in event
        //   "u": 160,           // Final update ID in event
        //   "b": [              // Bids to be updated
        //     [
        //       "0.0024",       // Price level to be updated
        //       "10"            // Quantity
        //     ]
        //   ],
        //   "a": [              // Asks to be updated
        //     [
        //       "0.0026",       // Price level to be updated
        //       "100"           // Quantity
        //     ]
        //   ]

        static EVENT_TYPE = 'depthUpdate';

        /**
         * Event time
         *
         * @type {int}
         */
        eventTime;

        /**
         * Symbol in uppercase
         *
         * @type {string}
         */
        symbol;

        /**
         * First update ID in event
         *
         * @type {int}
         */
        firstUpdateId;

        /**
         * Final update ID in event
         *
         * @type {int}
         */
        finalUpdateId;

        /**
         * Bids to be updated
         *
         * @type {BinanceStream.DepthItem[]}
         */
        bids = [];

        /**
         * Asks to be updated
         *
         * @type {BinanceStream.DepthItem[]}
         */
        asks = [];

        /**
         * @param {object} data
         */
        constructor(data) {
            if (data['e'] !== BinanceStream.DepthUpdate.EVENT_TYPE) {
                throw new Error(`Incorrect depth update event type: ${data['e']}`);
            }

            this.eventTime = data['E'];
            this.symbol = data['s'];
            this.firstUpdateId = data['U'];
            this.finalUpdateId = data['u'];

            if (data['b'].length) {
                data['b'].forEach(bidData => {
                    this.bids.push(new BinanceStream.DepthItem(bidData))
                });
            }

            if (data['a'].length) {
                data['a'].forEach(askData => {
                    this.asks.push(new BinanceStream.DepthItem(askData))
                });
            }
        }
    }

    static DepthItem = class {
        /**
         * Price. Numeric string
         *
         * @type {string}
         */
        priceString;

        /**
         * Price in float
         *
         * @type {number}
         */
        price;

        /**
         * Quantity. Numeric string
         *
         * @type {string}
         */
        quantityString;

        /**
         * Quantity in float
         *
         * @type {number}
         */
        quantity;

        /**
         * Amount sum in float
         *
         * @type {number}
         */
        amount;

        /**
         * @param {string[]} data
         */
        constructor(data) {
            this.priceString = data[0];
            this.quantityString = data[1];
            this.price = parseFloat(this.priceString);
            this.quantity = parseFloat(this.quantityString);
            this.amount = this.price * this.quantity;
        }
    }

    static Message = class {
        /**
         * @type {string}
         */
        streamString;

        /**
         * @type {BinanceStream.Stream}
         */
        stream;

        /**
         * @type {Map}
         */
        data;

        /**
         * @type {BinanceStream.Trade|null}
         */
        trade = null;

        /**
         * @type {BinanceStream.DepthUpdate|null}
         */
        depthUpdate = null;

        /**
         * @param {Map} json
         */
        constructor(json) {
            this.streamString = json['stream'];
            this.stream = BinanceStream.Stream.parseString(this.streamString);
            this.data = json['data'];

            switch (this.stream.dataType) {
                case BinanceStream.Stream.TRADE:
                    this.trade = new BinanceStream.Trade(this.data);
                    break;

                case BinanceStream.Stream.DEPTH:
                    this.depthUpdate = new BinanceStream.DepthUpdate(this.data);
                    break;

                default:
                    console.log(this.data);
            }
        }
    }
}