class DefenceIndicator
{
    /**
     * Number of rows in depth table
     *
     * @type {number}
     */
    static DEPTH_TABLE_ROWS = 100;

    /**
     * Depth table step in decipercents
     *
     * @type {number}
     */
    static DEPTH_TABLE_ROW_STEP = 1;

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

        /**
         * @type {HTMLDivElement}
         */
        orderBooksDiv = document.getElementById('orderBooks');

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
                    const depth = await this.binanceApi.getDepth(symbol, 10000);

                    this.binanceSocket.subscribe([
                        BinanceStream.Stream.depth(symbol, 100)
                    ]);

                    /**
                     * @type {HTMLTableSectionElement}
                     */
                    const tbody = document.getElementById('mainTableBody');
                    const htmlTableRow = tbody.insertRow();

                    const orderBookDiv = document.createElement('div');
                    this.orderBooksDiv.append(orderBookDiv);

                    const market = new DefenceIndicator.Market(symbol, depth, this.binanceApi, htmlTableRow,
                        orderBookDiv);
                    this.markets.set(symbol, market);
                } catch (exception) {
                    console.log(exception);
                }
            }
        }
    }

    static Market = class {
        static VALUES_PERCENTS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200];

        /**
         * Symbol in uppercase
         *
         * @type {string}
         */
        symbol;

        /**
         * @type {number|null}
         */
        price = null;

        /**
         * @type {number|null}
         */
        bestBidPrice = null;

        /**
         * @type {number|null}
         */
        bestAskPrice = null;

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
         * @type {HTMLElement}
         */
        htmlPriceElement;

        /**
         * @private
         * @type {number}
         */
        valuesUpdateInterval;

        /**
         * @type {BinanceApi.Api}
         */
        binanceApi;

        /**
         * HTMLDivElement
         */
        orderBookDiv;

        /**
         * @type {HTMLTableCellElement[]}
         */
        htmlDepthBidPrices = [];

        /**
         * @type {HTMLTableCellElement[]}
         */
        htmlDepthAskPrices = [];

        /**
         * @type {HTMLTableCellElement[]}
         */
        htmlDepthBidAmounts = [];

        /**
         * @type {HTMLTableCellElement[]}
         */
        htmlDepthAskAmounts = [];

        /**
         * @type {number[]}
         */
        depthBidAmounts = [];

        /**
         * @type {number[]}
         */
        depthAskAmounts = [];

        /**
         * @type {number}
         */
        symbolsAfterComma = 0;

        depthPrice = null;


        /**
         * @param {string} symbol
         * @param {BinanceApi.Depth} depth
         * @param {BinanceApi.Api} binanceApi
         * @param {HTMLTableRowElement} htmlTableRow
         * @param {HTMLDivElement} orderBookDiv
         */
        constructor(symbol, depth, binanceApi, htmlTableRow, orderBookDiv) {
            this.symbol = symbol;

            depth.bids.forEach((depthBid) => {
                let priceFraction = depthBid.priceString.split('.')[1];
                priceFraction = priceFraction.replace(/0+$/g, '');
                if (priceFraction.length > this.symbolsAfterComma) {
                    this.symbolsAfterComma = priceFraction.length;
                }
            })

            this.updateBids(depth.bids);
            this.updateAsks(depth.asks);

            this.lastDepthUpdateId = depth.lastUpdateId;

            this.bestAskPrice = Math.min(...Array.from(this.depthAsks.keys()));
            this.bestBidPrice = Math.max(...Array.from(this.depthBids.keys()));

            this.price = this.bestBidPrice;

            this.binanceApi = binanceApi;
            this.htmlTableRow = htmlTableRow;

            // Symbol cell
            this.htmlTableCellSymbol = this.htmlTableRow.insertCell();
            this.htmlTableCellSymbol.classList.add('text-center');
            this.htmlTableCellSymbol.classList.add('align-middle');
            this.htmlTableCellSymbol.innerHTML =
                '<a class="btn btn-sm btn-outline-info" href="' + this.getSymbolButtonUri() + '" target="_blank">' +
                symbol + '</a>';

            this.htmlTableCellSpread = this.htmlTableRow.insertCell();
            this.htmlTableCellSpread.classList.add('text-center');
            this.htmlTableCellSpread.classList.add('align-middle');

            this.orderBookDiv = orderBookDiv;
            this.orderBookDiv.classList.add('col');
            this.orderBookDiv.classList.add('p-1');

            const orderBookCard = document.createElement('div');
            orderBookCard.classList.add('card');
            orderBookCard.classList.add('order-book-card');

            const htmlSymbolElement = document.createElement('span');
            htmlSymbolElement.innerText = symbol;

            this.htmlPriceElement = document.createElement('span');
            this.htmlPriceElement.style.float = 'right';
            this.htmlPriceElement.classList.add('badge');
            this.htmlPriceElement.innerHTML = this.price.toFixed(this.symbolsAfterComma);
            this.htmlPriceElement.classList.add('bg-info');

            const orderBookCardHeader = document.createElement('div');
            orderBookCardHeader.classList.add('card-header');
            orderBookCardHeader.append(htmlSymbolElement, this.htmlPriceElement);

            const orderBookCardBody = document.createElement('div');
            orderBookCardBody.classList.add('card-body');
            orderBookCardBody.classList.add('p-0');

            const depthTable = document.createElement('table');
            depthTable.classList.add('table');
            depthTable.classList.add('table-hover');
            depthTable.classList.add('table-sm');
            depthTable.classList.add('table-borderless');

            for (let i = DefenceIndicator.DEPTH_TABLE_ROWS; i >= 1; i--) {
                const htmlDepthRow = depthTable.insertRow();
                const percentsCell = htmlDepthRow.insertCell();
                percentsCell.innerHTML = '<small>' + (i * DefenceIndicator.DEPTH_TABLE_ROW_STEP / 10).toFixed(1) + '</small>';
                percentsCell.classList.add('text-end');

                this.htmlDepthAskAmounts[i] = htmlDepthRow.insertCell();
                this.htmlDepthAskAmounts[i].classList.add('depth-ask-amount')
                this.htmlDepthAskAmounts[i].classList.add('text-end')

                this.htmlDepthAskPrices[i] = htmlDepthRow.insertCell();
                this.htmlDepthAskPrices[i].classList.add('text-end');
            }

            for (let i = 1; i <= DefenceIndicator.DEPTH_TABLE_ROWS; i++) {
                const htmlDepthRow = depthTable.insertRow();
                const percentsCell = htmlDepthRow.insertCell();
                percentsCell.innerHTML = '<small>' + (i * DefenceIndicator.DEPTH_TABLE_ROW_STEP / 10).toFixed(1) + '</small>';
                percentsCell.classList.add('text-end');

                this.htmlDepthBidAmounts[i] = htmlDepthRow.insertCell();
                this.htmlDepthBidAmounts[i].classList.add('depth-bid-amount')
                this.htmlDepthBidAmounts[i].classList.add('text-end')

                this.htmlDepthBidPrices[i] = htmlDepthRow.insertCell();
                this.htmlDepthBidPrices[i].classList.add('text-end');

            }


            orderBookCardBody.append(depthTable);
            orderBookCard.append(orderBookCardHeader, orderBookCardBody)
            this.orderBookDiv.append(orderBookCard)

            DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                const cellForPercent = this.htmlTableRow.insertCell();
                cellForPercent.classList.add('text-center');
                cellForPercent.classList.add('px-0');
                cellForPercent.style.width = '7%';

                this.htmlTableCellValues.set(percent, cellForPercent);
            })

            this.valuesUpdateInterval = setInterval(() => {
                const minDepthAskPrice = Math.min(...Array.from(this.depthAsks.keys()));
                const maxDepthBidPrice = Math.max(...Array.from(this.depthBids.keys()));

                /**
                 * @type {number|null}
                 */
                let newPrice = null;
                if (this.bestAskPrice !== null && minDepthAskPrice > this.bestAskPrice) {
                    newPrice = minDepthAskPrice;
                } else if (this.bestBidPrice !== null && maxDepthBidPrice < this.bestBidPrice) {
                    newPrice = maxDepthBidPrice;
                }

                this.bestAskPrice = minDepthAskPrice;
                this.bestBidPrice = maxDepthBidPrice;

                if (newPrice !== null) {
                    this.htmlPriceElement.innerHTML = newPrice.toFixed(this.symbolsAfterComma);
                    if (newPrice > this.price) {
                        this.htmlPriceElement.classList.remove('bg-info');
                        this.htmlPriceElement.classList.remove('bg-danger');
                        this.htmlPriceElement.classList.add('bg-success');
                    } else if (newPrice < this.price) {
                        this.htmlPriceElement.classList.remove('bg-info');
                        this.htmlPriceElement.classList.remove('bg-success');
                        this.htmlPriceElement.classList.add('bg-danger');
                    }

                    this.price = newPrice;
                }

                this.htmlTableCellSpread.innerHTML =
                    `<small style="color: red;">${this.bestAskPrice.toFixed(this.symbolsAfterComma)}</small><br>` +
                    `<small style="color: green;">${this.bestBidPrice.toFixed(this.symbolsAfterComma)}</small>`;

                let depthAsksAmounts = {};
                let depthBidsAmounts = {};

                DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                    const maxDepthAskPrice = minDepthAskPrice * (1 + percent / 1000);
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

                // Update bulls defence percents
                DefenceIndicator.Market.VALUES_PERCENTS.forEach((percent) => {
                    const defence = depthAsksAmounts[percent] === 0 && depthBidsAmounts[percent] === 0
                        ? 0
                        : (depthBidsAmounts[percent] /
                            (depthAsksAmounts[percent] + depthBidsAmounts[percent]));

                    const diff = Math.round((depthBidsAmounts[percent] - depthAsksAmounts[percent]) / 1000);

                    const backgroundOpacity = Math.abs(defence - 0.5) * 2;
                    if (defence >= 0.5) {
                        this.htmlTableCellValues.get(percent).style.background = `rgba(0, 255, 0, ${backgroundOpacity})`;
                    } else {
                        this.htmlTableCellValues.get(percent).style.background = `rgba(255, 0, 0, ${backgroundOpacity})`;
                    }

                    const defenceString = Math.round(defence * 100);
                    this.htmlTableCellValues.get(percent).innerHTML =
                        `${defenceString}<br><small>${diff.toLocaleString()}k</small>`;
                });


                // Update prices cells
                if (this.depthPrice === null || this.depthPrice !== this.price) {
                    for (let i = 1; i <= DefenceIndicator.DEPTH_TABLE_ROWS; i++) {
                        const depthStepPercents = i * DefenceIndicator.DEPTH_TABLE_ROW_STEP / 10;

                        const depthStepBidPriceMin = this.price * (100 - depthStepPercents) / 100;
                        const depthStepBidPriceMinString = depthStepBidPriceMin.toFixed(this.symbolsAfterComma);
                        if (this.htmlDepthBidPrices[i].innerText !== depthStepBidPriceMinString) {
                            this.htmlDepthBidPrices[i].innerText = depthStepBidPriceMinString;
                        }

                        const depthStepAskPriceMax = this.price * (100 + depthStepPercents) / 100;
                        const depthStepAskPriceMaxString = depthStepAskPriceMax.toFixed(this.symbolsAfterComma);
                        if (this.htmlDepthAskPrices[i].innerText !== depthStepAskPriceMaxString) {
                            this.htmlDepthAskPrices[i].innerText = depthStepAskPriceMaxString;
                        }
                    }

                    this.depthPrice = this.price;
                }

                /**
                 * @type {number[]}
                 */
                const depthBidAmountsNew = [];
                this.depthBids.forEach((depthBid) => {
                    const priceDiffPpm = Math.ceil((this.price - depthBid.price) * 1000 / this.price / DefenceIndicator.DEPTH_TABLE_ROW_STEP);
                    if (depthBidAmountsNew[priceDiffPpm] === undefined) {
                        depthBidAmountsNew[priceDiffPpm] = depthBid.amount;
                    } else {
                        depthBidAmountsNew[priceDiffPpm] += depthBid.amount;
                    }
                });

                const depthAskAmountsNew = [];
                this.depthAsks.forEach((depthAsk) => {
                    const priceDiffPpm = Math.ceil((depthAsk.price - this.price) * 1000 / this.price / DefenceIndicator.DEPTH_TABLE_ROW_STEP);
                    if (depthAskAmountsNew[priceDiffPpm] === undefined) {
                        depthAskAmountsNew[priceDiffPpm] = depthAsk.amount;
                    } else {
                        depthAskAmountsNew[priceDiffPpm] += depthAsk.amount;
                    }
                });


                let depthBidAmountsSum = 0;
                let depthAskAmountsSum = 0;
                for (let i = 1; i <= DefenceIndicator.DEPTH_TABLE_ROWS; i++) {
                    if (depthBidAmountsNew[i] === undefined) {
                        depthBidAmountsNew[i] = 0;
                    }

                    if (depthBidAmountsNew[i] !== this.depthBidAmounts[i]) {
                        this.depthBidAmounts[i] = depthBidAmountsNew[i];
                        this.htmlDepthBidAmounts[i].innerText = (this.depthBidAmounts[i] / 1000).toFixed(1);
                        this.htmlDepthBidAmounts[i].style.backgroundColor = DefenceIndicator.Market.getDepthAmountColor(this.depthBidAmounts[i], true);
                    }

                    if (depthAskAmountsNew[i] === undefined) {
                        depthAskAmountsNew[i] = 0;
                    }

                    if (depthAskAmountsNew[i] !== this.depthAskAmounts[i]) {
                        this.depthAskAmounts[i] = depthAskAmountsNew[i];
                        this.htmlDepthAskAmounts[i].innerText = (this.depthAskAmounts[i] / 1000).toFixed(1);
                        this.htmlDepthAskAmounts[i].style.backgroundColor = DefenceIndicator.Market.getDepthAmountColor(this.depthAskAmounts[i], false);
                    }
                }

            }, 300);



            this.valuesUpdateInterval = setInterval(() => {
                this.binanceApi.getDepth(this.symbol, 20000).then(depth => {
                    this.lastDepthUpdateId = depth.lastUpdateId;

                    this.depthBids.clear();
                    this.updateBids(depth.bids);

                    this.depthAsks.clear();
                    this.updateAsks(depth.asks);

                    // this.htmlTableCellSymbol.innerHTML =
                    //     '<a class="btn btn-sm btn-outline-info" href="' + this.getSymbolButtonUri() + '" target="_blank">' +
                    //     symbol + '</a><br>' +
                    //     '<small>' + (new Date()).toLocaleTimeString() + '</small>';
                });
            }, 20000);
        }

        static getDepthAmountColor(amount, isBid)
        {
            const backgroundOpacity = amount > 100000 ? 1 : amount / 100000;
            if (amount >= 1000000) {
                return `rgba(255, 207, 75, ${backgroundOpacity})`;
            }

            if (isBid) {
                return `rgba(0, 255, 0, ${backgroundOpacity})`;
            }

            return `rgba(255, 0, 0, ${backgroundOpacity})`;
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
    // await marketsCollection.addMarket('ETHUSDT');
    await marketsCollection.addMarket('SOLUSDT');
    // await marketsCollection.addMarket('LUNAUSDT');
    // await marketsCollection.addMarket('DASHUSDT');
    // await marketsCollection.addMarket('LTCUSDT');
    // await marketsCollection.addMarket('ATOMUSDT');
    // await marketsCollection.addMarket('DOTUSDT');
    // await marketsCollection.addMarket('MATICUSDT');
    await marketsCollection.addMarket('OGNUSDT');
    await marketsCollection.addMarket('MTLUSDT');
    await marketsCollection.addMarket('WAVESUSDT');
    await marketsCollection.addMarket('AXSUSDT');
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
