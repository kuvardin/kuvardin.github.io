const tradesLineChartElement = document.getElementById('trades-line-chart');
const pricesLineChartElement = document.getElementById('prices-line-chart');

const depthAsksTable = $('#depth-asks');
const depthBidsTable = $('#depth-bids');
const tradesTable = $('#trades');

class Dashboard
{
    /**
     * Binance socket connection
     *
     * @type {BinanceStream.Socket}
     */
    binanceSocket = null;

    /**
     * Binance API connection
     *
     * @type {BinanceApi.Api}
     */
    binanceApi = new BinanceApi.Api();

    /**
     * Cached trades line chart update interval
     *
     * @type {number|null}
     */
    tradesLineChartUpdateInterval = null;

    /**
     * @type {string[]}
     */
    tradesLineChartLabels = [];

    /**
     * Cached prices line chart update interval
     *
     * @type {number|null}
     */
    pricesLineChartUpdateInterval = null;

    /**
     * @type {string[]}
     */
    pricesLineChartLabels = [];

    /**
     * Cached depth display update interval
     *
     * @type {number|null}
     */
    depthUpdateInterval = null;

    /**
     * Cached depth data update interval
     *
     * @type {null}
     */
    depthLoadInterval = null;

    tradesAmountSum = 0;
    tradesAmountAverages = [];

    tradesBuySum = 0;
    tradesBuyAverages = [];
    tradesOnlyBuyAverages = [];

    tradesSellSum = 0;
    tradesSellAverages = [];
    tradesOnlySellAverages = [];

    pricesNumber = 0;
    pricesSum = 0;
    pricesAverages = [];

    /**
     * Cached last depth update ID
     *
     * @type {int|null}
     */
    lastDepthUpdateId = null;

    /**
     * Cached last average price
     *
     * @type {number|null}
     */
    lastAveragePrice = null;

    /**
     * Markets symbol in lowercase
     *
     * @type {string}
     */
    marketSymbol;

    /**
     * Cached depth asks
     *
     * @type {Map<number, BinanceStream.DepthItem>}
     */
    depthAsks;

    /**
     * Cached depth bids
     *
     * @type {Map<number, BinanceStream.DepthItem>}
     */
    depthBids;

    /**
     * Milliseconds number per charts one step
     *
     * @type {number}
     */
    chartsStepMilliseconds;

    /**
     * Charts steps number
     *
     * @type {number}
     */
    chartsStepsMaxNumber = 30;

    /**
     * Минимальная цена сделки к отображению в стакане
     *
     * @type {number}
     */
    minTradeAmountToShow;

    /**
     * Минимальная цена ордера к отображению в стакане
     *
     * @type {number}
     */
    minDepthItemAmountToShow = 1000;

    /**
     * Количество секунд, после которых сделка в стакане удаляется
     *
     * @type {number}
     */
    tradeElementTTL;

    /**
     * Cached price from title tag
     *
     * @type {string|null}
     */
    priceInTitle = null;

    /**
     * Сумма для 100% заливки по горизонтали
     *
     * @type {number}
     */
    backgroundFullHeightSum = 500000;

    /**
     * Сумма для полной непрозрачности
     *
     * @type {number}
     */
    backgroundCapacitySum = 1000000;

    /**
     * Максимальное количество ордеров к отображению
     *
     * @type {number}
     */
    depthItemsMaxShow = 50;

    /**
     * Depth amounts round precision
     *
     * @type {number}
     */
    depthRoundTo;

    chartsOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                mode: 'index'
            },
            legend: {
                position: 'bottom',
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
    }

    tradesLineChart = new Chart(tradesLineChartElement, {
        type: 'line',
        data: {
            labels: this.tradesLineChartLabels,
            datasets: [
                {
                    label: 'Buy',
                    data: this.tradesBuyAverages,
                    fill: false,
                    borderColor: 'rgb(0,255,0)',
                    tension: 0.1,
                    cubicInterpolationMode: 'monotone',
                    radius: 0,
                },
                {
                    label: 'Sell',
                    data: this.tradesSellAverages,
                    fill: false,
                    borderColor: 'rgb(255,0,0)',
                    tension: 0.1,
                    cubicInterpolationMode: 'monotone',
                    radius: 0,
                },
                {
                    label: 'Only buy',
                    data: this.tradesOnlyBuyAverages,
                    fill: true,
                    borderColor: 'rgba(0,255,0,0.3)',
                    backgroundColor: 'rgba(0,255,0,0.3)',
                    radius: 0,
                    stepped: 'after',
                },
                {
                    label: 'Only sell',
                    data: this.tradesOnlySellAverages,
                    fill: true,
                    borderColor: 'rgba(255,0,0,0.3)',
                    backgroundColor: 'rgba(255,0,0,0.3)',
                    radius: 0,
                    stepped: 'after',
                },
            ]
        },
        options: this.chartsOptions,
    });

    pricesLineChart = new Chart(pricesLineChartElement, {
        type: 'line',
        data: {
            labels: this.pricesLineChartLabels,
            datasets: [
                {
                    label: 'Price',
                    data: this.pricesAverages,
                    fill: false,
                    borderColor: '#000000',
                    tension: 0.1,
                    cubicInterpolationMode: 'monotone',
                    radius: 0,
                },
            ]
        },
        options: this.chartsOptions,
    });


    init()
    {
        if (this.binanceSocket !== null) {
            this.binanceSocket.unsubscribeAll(1);
            this.binanceSocket.socket.close();
        }

        if (this.tradesLineChartUpdateInterval !== null) {
            clearInterval(this.tradesLineChartUpdateInterval);
        }

        if (this.pricesLineChartUpdateInterval !== null) {
            clearInterval(this.pricesLineChartUpdateInterval);
        }

        this.tradesAmountSum = 0;
        this.tradesAmountAverages.length = 0;

        this.tradesBuySum = 0;
        this.tradesBuyAverages.length = 0;
        this.tradesOnlyBuyAverages.length = 0;

        this.tradesSellSum = 0;
        this.tradesSellAverages.length = 0;
        this.tradesOnlySellAverages.length = 0;

        this.pricesNumber = 0;
        this.pricesSum = 0;
        this.pricesAverages.length = 0;
        this.tradesLineChartLabels.length = 0;
        this.pricesLineChartLabels.length = 0;

        this.tradesLineChart.update();
        this.pricesLineChart.update();

        // this.tradesTable.empty();

        this.marketSymbol = document.getElementById('input-symbol').value;

        depthAsksTable.empty();
        depthBidsTable.empty();

        this.depthAsks = new Map();
        this.depthBids = new Map();
        this.chartsStepMilliseconds = parseInt(document.getElementById('input-charts-step-duration').value) * 1000;

        this.chartsStepsNumber = 30;
        this.priceInTitle = null;
        this.backgroundFullHeightSum = 50000;
        this.backgroundCapacitySum = 100000;

        this.initTradesBook();
        this.initDepthBook();

        /**
         * @param {BinanceStream.Message} message
         */
        let onmessage = (message) => {
            if (message.trade !== null) {
                const trade = message.trade;
                const priceRounded = trade.price.toString();

                if (this.priceInTitle !== priceRounded) {
                    top.document.title = `${priceRounded} ${this.marketSymbol.toUpperCase()}`;
                    this.priceInTitle = priceRounded;
                }

                this.pricesNumber += trade.quantity;
                this.pricesSum += trade.amount;

                this.tradesAmountSum += trade.amount;
                if (trade.isBuy()) {
                   this.tradesBuySum += trade.amount;
                } else {
                    this.tradesSellSum += trade.amount;
                }

                if (trade.amount > this.minTradeAmountToShow && trade.amount > 1) {
                    const backgroundHeight = trade.amount < this.backgroundFullHeightSum
                        ? (trade.amount * 100 / this.backgroundFullHeightSum)
                        : 100;

                    const backgroundOpacity = 0.2 +
                        (trade.amount < this.backgroundCapacitySum
                            ? (trade.amount / this.backgroundCapacitySum) : 1) * 0.8;

                    const bgColor = trade.isBuy()
                        ? `rgba(0,255,0,${backgroundOpacity})`
                        : `rgba(255,0,0,${backgroundOpacity})`;

                    const tradeElementId = 'trade' + trade.tradeId;
                    const amountString = Math.ceil(trade.amount).toLocaleString();
                    const tradeHtml = `<tr id="${tradeElementId}" style="background: linear-gradient(to right, ${bgColor} ${backgroundHeight}%, transparent 0);">` +
                        `<td>${priceRounded}</td>` +
                        `<td>${trade.quantity}</td>` +
                        `<td class="text-end">${amountString}</td>` +
                        '</tr>';

                    tradesTable.prepend(tradeHtml);
                    this.autoDelete(tradeElementId, this.tradeElementTTL);
                }
            } else if (message.depthUpdate !== null) {
                if (this.lastDepthUpdateId === null || message.depthUpdate.finalUpdateId > this.lastDepthUpdateId) {
                    const depthUpdate = message.depthUpdate;
                    depthUpdate.asks.forEach(ask => {
                        if (ask.quantity === 0) {
                            if (this.depthAsks.has(ask.price)) {
                                this.depthAsks.delete(ask.price);
                            }
                        } else {
                            this.depthAsks.set(ask.price, ask);
                        }
                    });

                    depthUpdate.bids.forEach(bid => {
                        if (bid.quantity === 0) {
                            if (this.depthBids.has(bid.price)) {
                                this.depthBids.delete(bid.price);
                            }
                        } else {
                            this.depthBids.set(bid.price, bid);
                        }
                    });
                }
            }
        }

        this.chartsUpdateInterval = setInterval(() => {
            const date = new Date();

            if (this.tradesSellAverages.length > this.chartsStepsNumber) {
                this.tradesAmountAverages.shift();
                this.tradesSellAverages.shift();
                this.tradesBuyAverages.shift();
                this.pricesAverages.shift();

                this.tradesOnlySellAverages.shift();
                this.tradesOnlyBuyAverages.shift();

                this.tradesLineChartLabels.shift();
                this.pricesLineChartLabels.shift();
            }

            const currentAverageBuy = this.tradesBuySum * 1000 / this.chartsStepMilliseconds;
            this.tradesBuyAverages.push(currentAverageBuy);

            const currentAverageSell = this.tradesSellSum * 1000 / this.chartsStepMilliseconds;
            this.tradesSellAverages.push(this.currentAverageSell);

            this.tradesOnlySellAverages.push(
                currentAverageSell > currentAverageBuy ? currentAverageSell - currentAverageBuy : 0
            );

            this.tradesOnlyBuyAverages.push(
                currentAverageBuy > currentAverageSell ? currentAverageBuy - currentAverageSell : 0
            );

            if (this.pricesSum === 0) {
                if (this.lastAveragePrice !== null) {
                    this.pricesAverages.push(this.lastAveragePrice);
                }
            } else {
                this.lastAveragePrice = this.pricesSum / this.pricesNumber;
                this.pricesAverages.push(this.lastAveragePrice);
            }

            this.tradesAmountSum = 0;
            this.tradesBuySum = 0;
            this.tradesSellSum = 0;
            this.pricesNumber = 0;
            this.pricesSum = 0;

            this.tradesLineChartLabels.push(date.toLocaleTimeString());
            this.pricesLineChartLabels.push(date.toLocaleTimeString());

            this.tradesLineChart.update();
            this.pricesLineChart.update();
        }, this.chartsStepMilliseconds);



        this.binanceSocket = new BinanceStream.Socket(onmessage);
        this.binanceSocket.socket.onopen = () => {
            this.binanceSocket.subscribe([
                BinanceStream.Stream.trade(this.marketSymbol.toLowerCase()),
                BinanceStream.Stream.depth(this.marketSymbol.toLowerCase(), 100),
            ], 1);
        }
    }


    initTradesBook()
    {
        this.minTradeAmountToShow = parseInt(document.getElementById('minTradeAmountToShow').value);
        this.tradeElementTTL = 3;
    }

    /**
     * @param {Map<String, BinanceStream.DepthItem>} items
     * @param {boolean} reverse
     * @return {Map<String, BinanceStream.DepthItem>}
     */
    sortDepthItems(items, reverse = false)
    {
        const result = [...items.entries()].sort(function (a, b) {
            if (a[1].price < b[1].price) {
                return -1;
            }

            if (b[1].price < a[1].price) {
                return 1;
            }

            return 0;
        });

        // console.log(result);
        return reverse ? new Map(result.reverse()) : new Map(result);
    }

    /**
     * @param {Map<String, BinanceStream.DepthItem>} items
     * @param {jQuery|HTMLElement} domElement
     * @param {boolean} isBids
     */
    displayDepthItems(items, domElement, isBids)
    {
        let roundToNumbers = null;
        if (this.depthRoundTo !== null && this.depthRoundTo !== 0) {
            const roundToParts = this.depthRoundTo.toString().split('.');
            if (roundToParts.length > 1 && roundToParts[1] !== '') {
                roundToNumbers = roundToParts[1].length;
            } else {
                roundToNumbers = 0;
            }
        }

        /**
         * @type {Map<string, DepthSimpleItem>}
         */
        let quantities = new Map();

        items.forEach(item => {
            let priceString;
            if (this.depthRoundTo !== null && this.depthRoundTo !== 0) {
                let price = isBids
                    ? (Math.floor(item.price / this.depthRoundTo) * this.depthRoundTo)
                    : (Math.ceil(item.price / this.depthRoundTo) * this.depthRoundTo);
                priceString = roundToNumbers === null ? price.toString() : price.toFixed(roundToNumbers);
            } else {
                priceString = item.priceString;
            }

            if (quantities.has(priceString)) {
                quantities.get(priceString).add(item.quantity, item.amount);
            } else {
                quantities.set(priceString, new DepthSimpleItem(item.quantity, item.amount));
            }
        });

        let i = 0;
        let resultHtml = '';

        let bidsAmountSum = 0;
        let asksAmountSum = 0;

        quantities.forEach((depthSimpleItem, priceString) => {
            if (depthSimpleItem.quantity !== 0 && depthSimpleItem.amount > this.minDepthItemAmountToShow &&
                depthSimpleItem.amount > 1) {

                if (i++ >= this.depthItemsMaxShow) {
                    return;
                }

                const backgroundHeight = depthSimpleItem.amount < this.backgroundFullHeightSum
                    ? (depthSimpleItem.amount * 100 / this.backgroundFullHeightSum)
                    : 100;

                const backgroundOpacity = 0.2 +
                    (depthSimpleItem.amount < this.backgroundCapacitySum
                        ? (depthSimpleItem.amount / this.backgroundCapacitySum) : 1) * 0.8;

                const amountString = (depthSimpleItem.amount / 1000).toFixed(1).toLocaleString();
                const quantityString = parseFloat(depthSimpleItem.quantity.toPrecision(8)).toString();

                if (isBids) {
                    bidsAmountSum += depthSimpleItem.amount;
                    const bidsAmountSumString = (bidsAmountSum / 1000).toFixed(1).toLocaleString();
                    resultHtml += `<tr style="background: linear-gradient(to left, rgba(0,255,0,${backgroundOpacity}) ${backgroundHeight}%, transparent 0);">` +
                        `<td class="text-end">${bidsAmountSumString}</td>` +
                        `<td class="text-end">${amountString}</td>` +
                        `<td class="text-end">${quantityString}</td>` +
                        `<td class="text-end"><b>${priceString}</b></td>` +
                        '</tr>';
                } else {
                    asksAmountSum += depthSimpleItem.amount;
                    const asksAmountSumString = (asksAmountSum / 1000).toFixed(1).toLocaleString();
                    resultHtml += `<tr style="background: linear-gradient(to right, rgba(255,0,0,${backgroundOpacity}) ${backgroundHeight}%, transparent 0);">` +
                        `<td><b>${priceString}</b></td>` +
                        `<td class="text-end">${quantityString}</td>` +
                        `<td class="text-end">${amountString}</td>` +
                        `<td class="text-end">${asksAmountSumString}</td>` +
                        '</tr>';
                }
            }
        });

        domElement.html(resultHtml);
    }

    initDepthBook()
    {
        if (this.depthUpdateInterval !== null) {
            clearInterval(this.depthUpdateInterval);
        }

        if (this.depthLoadInterval !== null) {
            clearInterval(this.depthLoadInterval);
        }

        this.lastDepthUpdateId = null;
        this.depthAsks = new Map();
        this.depthBids = new Map();
        this.minDepthItemAmountToShow = 1000;
        this.depthItemsMaxShow = 50;
        this.depthRoundTo = 0.01;

        this.depthUpdateInterval = setInterval(() => {
            this.depthAsks = this.sortDepthItems(this.depthAsks);
            this.displayDepthItems(this.depthAsks, depthAsksTable, false);

            this.depthBids = this.sortDepthItems(this.depthBids, true);
            this.displayDepthItems(this.depthBids, depthBidsTable, true);
        }, 200);

        this.depthLoadInterval = setInterval(() => {
            this.binanceApi.getDepth(this.marketSymbol, 1000).then(depth => {
                this.lastDepthUpdateId = depth.lastUpdateId;

                this.depthBids.clear();
                depth.bids.forEach(bid => {
                    if (bid.quantity !== 0) {
                        this.depthBids.set(bid.price, bid);
                    }
                });

                this.depthAsks.clear();
                depth.asks.forEach(ask => {
                    if (ask.quantity !== 0) {
                        this.depthAsks.set(ask.price, ask);
                    }
                });
            });
        }, 10000);

    }

    /**
     * @param {string} elementId
     * @param {int} seconds
     * @return {Promise<void>}
     */
    async autoDelete(elementId, seconds)
    {
        await new Promise(r => setTimeout(r, seconds * 1000));
        let el = document.getElementById(elementId);
        el.parentNode.removeChild(el);
    }
}

class DepthSimpleItem
{
    /**
     * @type {number}
     */
    quantity;

    /**
     * @type {number}
     */
    amount;

    /**
     * @param {number} quantity
     * @param {number} amount
     */
    constructor(quantity, amount) {
        this.quantity = quantity;
        this.amount = amount;
    }

    /**
     * @param {number} quantity
     * @param {number} amount
     */
    add(quantity, amount) {
        this.quantity += quantity;
        this.amount += amount;
    }
}