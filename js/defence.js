class DefenceIndicator
{
    static MarketsCollection = class {
        /**
         * @type {BinanceStream.Socket}
         */
        binanceSocket;

        /**
         * @type {BinanceApi.Api}
         */
        binanceApi;

        /**
         * @type {Map<string, DefenceIndicator.Market>}
         */
        markets = new Map();

        constructor() {
            this.binanceSocket = new BinanceStream.Socket((message) => {
                const symbol = message.stream.symbol.toUpperCase();
                if (!this.markets.has(symbol)) {
                    console.log('Unknown stream: ' + message.stream.toString());
                    console.log(this.markets);
                    return;
                }


                if (message.depthUpdate !== null) {
                    this.markets.get(symbol).processDepthUpdate(message.depthUpdate);
                } else if (message.trade !== null) {
                    this.markets.get(symbol).processTrade(message.trade);
                }
            });

            this.binanceApi = new BinanceApi.Api();
        }

        /**
         * @param {string} symbol
         * @returns {Promise<void>}
         */
        async addMarket(symbol)
        {
            symbol = symbol.toUpperCase();

            if (this.markets.has(symbol)) {
                console.log('Symbol already added: ' + symbol);
            } else {
                try {
                    const depth = await this.binanceApi.getDepth(symbol, 1000);

                    this.binanceSocket.subscribe([
                        BinanceStream.Stream.depth(symbol, 100)
                    ]);

                    /**
                     * @type {HTMLTableSectionElement}
                     */
                    const tbody = document.getElementById('mainTableBody');
                    const htmlTableRow = tbody.insertRow();

                    const market = new DefenceIndicator.Market(symbol, depth, this.binanceApi, htmlTableRow);
                    this.markets.set(symbol, market);
                } catch (exception) {
                    console.log(exception);
                }
            }
        }
    }

    static Market = class {
        static VALUES_PERCENTS = [5, 10, 20, 30, 50, 100, 200];

        /**
         * Symbol in uppercase
         *
         * @type {string}
         */
        symbol;

        /**
         * @type {Map<number, BinanceStream.DepthItem>}
         */
        depthBids = new Map();

        /**
         * @type {Map<number, BinanceStream.DepthItem>}
         */
        depthAsks = new Map();

        /**
         * Cached last depth update ID
         *
         * @type {int}
         */
        lastDepthUpdateId;

        /**
         * @type {HTMLTableRowElement}
         */
        htmlTableRow;

        /**
         * @type {HTMLTableCellElement}
         */
        htmlTableCellSymbol;

        /**
         * @type {HTMLTableCellElement}
         */
        htmlTableCellSpread;

        /**
         * @type {Map<number, HTMLTableCellElement>}
         */
        htmlTableCellValues = new Map();

        /**
         * @private
         * @type {number}
         */
        _valuesUpdateInterval;

        /**
         * @private
         * @type {number}
         */
        _depthUpdateInterval;

        /**
         * @type {BinanceApi.Api}
         */
        binanceApi;

        /**
         * @param {string} symbol
         * @param {BinanceApi.Depth} depth
         * @param {BinanceApi.Api} binanceApi
         * @param {HTMLTableRowElement} htmlTableRow
         */
        constructor(symbol, depth, binanceApi, htmlTableRow) {
            this.symbol = symbol;
            this.updateBids(depth.bids);
            this.updateAsks(depth.asks);
            this.lastDepthUpdateId = depth.lastUpdateId;

            this.binanceApi = binanceApi;
            this.htmlTableRow = htmlTableRow;

            // Symbol cell
            this.htmlTableCellSymbol = this.htmlTableRow.insertCell();
            this.htmlTableCellSymbol.innerHTML =
                '<a class="btn btn-sm btn-outline-info" href="' + this.getSymbolButtonUri() + '" target="_blank">' + symbol + '</a>';

            this.htmlTableCellSpread = this.htmlTableRow.insertCell();

            DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                const cellForPercent = this.htmlTableRow.insertCell();
                cellForPercent.classList.add('text-center');
                this.htmlTableCellValues.set(percent, cellForPercent);
            })

            this._valuesUpdateInterval = setInterval(() => {
                const minDeptAskPrice = Math.min(...Array.from(this.depthAsks.keys()));
                const maxDepthBidPrice = Math.max(...Array.from(this.depthBids.keys()));

                this.htmlTableCellSpread.innerHTML = `<small style="color: red;">${minDeptAskPrice}</small><br>` +
                    `<small style="color: green;">${maxDepthBidPrice}</small>`;

                let depthAsksAmounts = {};
                let depthBidsAmounts = {};

                DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                    const maxDepthAskPrice = minDeptAskPrice * (1 + percent / 1000);
                    this.depthAsks.forEach((value) => {
                        if (value.price < maxDepthAskPrice) {
                            if (depthAsksAmounts[percent]) {
                                depthAsksAmounts[percent] += value.amount;
                            } else {
                                depthAsksAmounts[percent] = value.amount;
                            }
                        }
                    });

                    const minDepthBidPrice = maxDepthBidPrice * (1 - percent / 1000);
                    this.depthBids.forEach((value) => {
                        if (value.price > minDepthBidPrice) {
                            if (depthBidsAmounts[percent]) {
                                depthBidsAmounts[percent] += value.amount;
                            } else {
                                depthBidsAmounts[percent] = value.amount;
                            }
                        }
                    });
                });




                DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                    const defence = depthAsksAmounts[percent] === 0 && depthBidsAmounts[percent] === 0
                        ? 0
                        : (depthBidsAmounts[percent] /
                            (depthAsksAmounts[percent] + depthBidsAmounts[percent]));

                    const diff = Math.round((depthBidsAmounts[percent] - depthAsksAmounts[percent]) / 1000);

                    let backgroundOpacity;
                    if (defence >= 0.5) {
                        backgroundOpacity = (defence - 0.5) * 2;
                        this.htmlTableCellValues.get(percent).style.background = `rgba(0, 255, 0, ${backgroundOpacity})`;
                    } else {
                        backgroundOpacity = (0.5 - defence) * 2;
                        this.htmlTableCellValues.get(percent).style.background = `rgba(255, 0, 0, ${backgroundOpacity})`;
                    }

                    const defenceString = Math.round(defence * 100);
                    this.htmlTableCellValues.get(percent).innerHTML = `${defenceString}<br><small>${diff.toLocaleString()}k</small>`;
                });
            }, 300);

            this._valuesUpdateInterval = setInterval(() => {
                this.binanceApi.getDepth(this.symbol, 1000).then(depth => {
                    this.lastDepthUpdateId = depth.lastUpdateId;

                    this.depthBids.clear();
                    this.updateBids(depth.bids);

                    this.depthAsks.clear();
                    this.updateAsks(depth.asks);

                    this.htmlTableCellSymbol.innerHTML =
                        '<a class="btn btn-sm btn-outline-info" href="' + this.getSymbolButtonUri() + '" target="_blank">' +
                        symbol + '</a><br>' +
                        '<small>' + (new Date()).toLocaleTimeString() + '</small>';
                });
            }, 20000);
        }

        /**
         * @returns {string}
         */
        getSymbolButtonUri()
        {
            return 'index.html?symbol=' + this.symbol;
        }

        /**
         * @param {BinanceStream.DepthItem[]} asks
         */
        updateAsks(asks)
        {
            asks.forEach(ask => {
                if (ask.quantity === 0) {
                    if (this.depthAsks.has(ask.price)) {
                        this.depthAsks.delete(ask.price);
                    }
                } else {
                    this.depthAsks.set(ask.price, ask);
                }
            });
        }

        /**
         * @param {BinanceStream.DepthItem[]} bids
         */
        updateBids(bids)
        {
            bids.forEach(bid => {
                if (bid.quantity === 0) {
                    if (this.depthBids.has(bid.price)) {
                        this.depthBids.delete(bid.price);
                    }
                } else {
                    this.depthBids.set(bid.price, bid);
                }
            });
        }

        /**
         * @param {BinanceStream.DepthUpdate} depthUpdate
         */
        processDepthUpdate(depthUpdate) {
            if (depthUpdate.finalUpdateId > this.lastDepthUpdateId) {
                this.updateAsks(depthUpdate.asks);
                this.updateBids(depthUpdate.bids);
            }
        }

        /**
         * @param {BinanceStream.Trade} trade
         */
        processTrade(trade) {

        }
    }
}

const marketsCollection = new DefenceIndicator.MarketsCollection();
marketsCollection.binanceSocket.socket.onopen = async () => {
    await marketsCollection.addMarket('BTCUSDT');
    await marketsCollection.addMarket('ETHUSDT');
    await marketsCollection.addMarket('SOLUSDT');
    await marketsCollection.addMarket('LUNAUSDT');
    await marketsCollection.addMarket('DASHUSDT');
    await marketsCollection.addMarket('LTCUSDT');
    await marketsCollection.addMarket('ATOMUSDT');
    await marketsCollection.addMarket('DOTUSDT');
    await marketsCollection.addMarket('MATICUSDT');
    await marketsCollection.addMarket('OGNUSDT');
    await marketsCollection.addMarket('MTLUSDT');
    await marketsCollection.addMarket('WAVESUSDT');
};

function addMarketFromInput() {
    if (marketsCollection.binanceSocket.socket.readyState === WebSocket.OPEN) {
        const symbol = document.getElementById('symbolForAdding').value;
        console.log('Trying to add: ' + symbol);
        marketsCollection.addMarket(symbol);
    } else {
        console.log('Socket in state: ' + marketsCollection.binanceSocket.socket.readyState);
    }
}
