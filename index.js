Date.prototype.addDays = function(days) {
    const date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

class Exploration {
    constructor(data) {
        this._exploration = data['explorations']
        this._startDate = data['startDate']
    }
    getExploration(date, tzOffset) {
        let startDate = Date.parse(tzOffset > 0 ? this._startDate + ' UTC+' + tzOffset : this._startDate + ' UTC' + tzOffset)
        var days = Math.floor(Math.abs(date - startDate) / (1000 * 3600 * 24))
        return this._exploration[days % this._exploration.length]
    }
}

class FeatureQuest {
    constructor(data) {
        this._featureQuest = data['featureQuests']
        this._startDate = data['startDate']
    }
    getFeatureQuest(date, tzOffset) {
        let startDate = Date.parse(tzOffset > 0 ? this._startDate + ' UTC+' + tzOffset : this._startDate + ' UTC' + tzOffset)
        var days = Math.floor(Math.abs(date - startDate) / (1000 * 3600 * 24))
        return this._featureQuest[days % this._featureQuest.length]
    }
}

class LevelQuest {
    constructor(data) {
        this._featureQuest = data['levelQuest']
        this._startDate = data['startDate']
    }
    getLevelQuest(date, tzOffset) {
        let startDate = Date.parse(tzOffset > 0 ? this._startDate + ' UTC+' + tzOffset : this._startDate + ' UTC' + tzOffset)
        var days = Math.floor(Math.abs(date - startDate) / (1000 * 3600 * 24))
        return this._featureQuest[days % this._featureQuest.length]
    }
}

class DailyOrder {
    constructor(data) {
        this._dailyOrder = data['dailyOrders']
        this._startDate = data['startDate']
    }
    getDailyOrders(date, tzOffset) {
        let startDate = Date.parse(tzOffset > 0 ? this._startDate + ' UTC+' + tzOffset : this._startDate + ' UTC' + tzOffset)
        var days = Math.floor(Math.abs(date - startDate) / (1000 * 3600 * 24))
        var results = this._dailyOrder.filter(daily => {
            return daily['schedule'].includes((days % daily['cycle']) + 1)
        })
        return results
    }
}

class ExtraOrder {
    constructor(data) {
        this._extraOrder = data
    }
    getExtraOrder(date, tzOffset) {
        var results = []
        this._extraOrder.forEach(group => {
            let startDate = Date.parse(tzOffset > 0 ? group['startDate'] + ' UTC+' + tzOffset : group['startDate'] + ' UTC' + tzOffset)
            let days = Math.floor(Math.abs(date - startDate) / (1000 * 3600 * 24))
            results.push(group['extraOrders'][days % group['extraOrders'].length])
        })
        return results
    }
}

class TextConsole {
    constructor(DOMelement) {
        this.DOMelement = DOMelement
    }
    clear() {
        this.DOMelement.text('')
    }
    print(s) {
        this.DOMelement.text(this.DOMelement.text() + s)
    }
    println(s) {
        this.print(s + '\n')
    }
}

class Forecast {
    _FORECAST_DAYS = 7
    constructor(DOMElement, data) {
        var self = this

        var buttonName = ['Forward', 'Backward']
        buttonName.forEach(function(name) {
            var $button = DOMElement.find('.forecast-' + name),
                handler = self['on' + name];
            $button.click(function() { handler.call(self) })
            $button.focus(function() { $(this).blur() })
        })

        this._region = localStorage.getItem("pso2-forecast-region")
        if (this._region == null) {
            localStorage.setItem("pso2-forecast-region", 'global')
        }

        var regionName = ['jp', 'global']
        regionName.forEach(function(name) {
            var $button = DOMElement.find('.forecast-' + name)
            $button.click(function() {
                DOMElement.find('.forecast-button-region').removeClass("active")
                $(this).addClass("active")
                self.setRegion(name)
            })
            $button.focus(function() { $(this).blur() })
            if (name == self._region) {
                $button.addClass("active")
            }
        })

        window.addEventListener("resize", function() {
            self.update()
        });

        this._baseDate = new Date()
        this._offset = 0
        this._dailyOrder = new DailyOrder(data["dailyOrder"])
        this._exploration = new Exploration(data["exploration"])
        this._featureQuest = new FeatureQuest(data["featureQuest"])
        this._levelQuest = new LevelQuest(data["levelQuest"])
        this._extraOrder = new ExtraOrder(data["extraOrder"])
        this._output = new TextConsole(DOMElement.find('.forecast-output'))

        this.update()

    }
    onForward() {
        this.moveStart(this._FORECAST_DAYS)
    }
    onBackward() {
        this.moveStart(-this._FORECAST_DAYS)
    }
    moveStart(days) {
        this._offset += days
        this.update()
    }
    setRegion(region) {
        this._region = region
        localStorage.setItem("pso2-forecast-region", region)
        this.update()
    }
    update() {
        var self = this
        var begin = this._baseDate.addDays(this._offset)
        var end = begin.addDays(this._FORECAST_DAYS)
        var offset = 0
        if (this._region == 'jp') {
            offset = 9
        } else if (this._region == 'global') {
            offset = -8
        }

        this._output.clear()

        var screenBig = window.screen.width < 735
        var key = this._region + '_name(en)'
        var jpFeature = screenBig ? ' (Feat.)' : ' (Featured Quest)'
        var globalRecommanded = screenBig ? ' (Rec.)' : ' (Recommended Quest)'
        var featureString = this._region == 'jp' ? jpFeature : globalRecommanded

        var printCO = function(order) {
            if (screenBig) {
                self._output.println(' ' + order[key])
                self._output.println('  ' + '\tMeseta: ' + order['meseta'] + '\tExp: ' + order['exp'])
            } else {
                self._output.println(' ' + order[key].padEnd(50, ' ') + '\tMeseta: ' + order['meseta'] + '\tExp: ' + order['exp'])
            }
        }

        for (var cur = new Date(begin.valueOf()); cur < end; cur = cur.addDays(1)) {
            this._output.println(cur.toISOString().slice(0, 10) + ':')

            var exploration = this._exploration.getExploration(cur, offset)
            this._output.println(' ' + exploration[key] + featureString)
            exploration['client_order'].forEach(value => {
                this._output.print(' ')
                printCO(value)
            })

            var feature = this._featureQuest.getFeatureQuest(cur, offset)
            feature.forEach(value => {
                this._output.println(' ' + value[key] + featureString)
            })

            var level = this._levelQuest.getLevelQuest(cur, offset)
            this._output.println(' ' + level[key] + featureString)

            var daily = this._dailyOrder.getDailyOrders(cur, offset)
            var extra = this._extraOrder.getExtraOrder(cur, offset)

            extra.forEach(value => {
                daily.splice(-2, 0, value)
            })
            daily.forEach(value => {
                printCO(value)
            })
            this._output.println('')
        }
    }
}

(function() {
    let requestURL = './DailyCalculator.json';
    let request = new XMLHttpRequest();
    request.open('GET', requestURL);
    request.responseType = 'json';
    request.send();
    request.onload = function() {
        const data = request.response;
        new Forecast($('#forecast'), data)
    }
})()