class BinanceApi {
    static Api = class {
        static HOST = 'https://api.binance.com';

        /**
         * @param {string} symbol
         * @param {int|null} limit
         * @return {Promise<BinanceApi.Depth>}
         */
        async getDepth(symbol, limit = null) {
            let response = await this.request('api/v3/depth', {
                symbol: symbol.toUpperCase(),
                limit: limit,
            });


            return new BinanceApi.Depth(response);
        }

        /**
         * @param method
         * @param {object} params
         * @return {Promise<any>}
         */
        async request(method, params = null) {
            let uri = BinanceApi.Api.HOST + '/api/v3/depth';
            if (params !== null) {
                for (let paramKey in params) {
                    if (params[paramKey] === null) {
                        delete params[paramKey];
                    }
                }

                uri += '?' + (new URLSearchParams(params)).toString();
            }

            let response = await fetch(uri, {
                cache: 'no-cache',
                mode: 'cors',
            });

            let decoded = await response.json();

            if (!response.ok) {
                throw new BinanceApi.Error(decoded);
            }

            return decoded;
        }
    }

    static Depth = class {
        /**
         * @type {int}
         */
        lastUpdateId;

        /**
         * @type {BinanceStream.DepthItem[]}
         */
        asks = [];

        /**
         * @type {BinanceStream.DepthItem[]}
         */
        bids = [];

        constructor(data) {
            this.lastUpdateId = data['lastUpdateId'];

            data['asks'].forEach(askData => {
                this.asks.push(new BinanceStream.DepthItem(askData));
            })

            data['bids'].forEach(bidData => {
                this.bids.push(new BinanceStream.DepthItem(bidData));
            })
        }
    }

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
         * @param {object} data
         */
        constructor(data) {
            this.code = data['code'];
            this.message = data['msg'];
        }
    }
}