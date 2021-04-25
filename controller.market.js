/*
This is the controller for the automated trading portion of my screeps AI.
The practical maximum of the energy costs is 2 * amount_traded.
*/

// ***** Options *****
var cpuThreshold = 3;
var sellThreshold = 8000;
var maxPerTick = 10;
var buyList = [[RESOURCE_UTRIUM, 0.6, 3000, 'W6N17'], [RESOURCE_KEANIUM, 0.6, 3000, 'E3S4']];
var dontSellList = [RESOURCE_POWER, RESOURCE_ENERGY];
var minSellPrice = 0.1;
var creditRatio = 0.95;
// ***** End *****

var _getTerminals = function() {
    if(!Game.hasOwnProperty('TERMINALS')) {
         Game.TERMINALS = [];
         for(let i in Game.rooms) {
             if(Game.rooms[i].terminal != undefined && Game.rooms[i].terminal.my && Game.rooms[i].terminal.cooldown == 0) {
                Game.TERMINALS.push(Game.rooms[i].terminal);
             }
         }
    }
    return Game.TERMINALS;
}

var _shouldTrade = function() {
    return Game.time % 43 == 0 && Game.cpu.getUsed() < (Game.cpu.limit - cpuThreshold) && _getTerminals().length > 0;
}

var _sellHighestPrice = function(resource, terminal) {
    var myAmount = terminal.store[resource];
    var highestOrder = _.max(Game.market.getAllOrders({type: ORDER_BUY, resourceType: resource}), (obj) => {return obj.price;});
    
    if(highestOrder.price < minSellPrice) { // don't sell if the best order is still bad
        return ERR_NOT_ENOUGH_RESOURCES;
    }
    
    var retVal = Game.market.deal(highestOrder.id, Math.min(myAmount, highestOrder.amount, sellThreshold), terminal.room.name);
    if(retVal == OK) {
        console.log('You just gained ' + (Math.min(myAmount, highestOrder.amount, sellThreshold) * highestOrder.price).toFixed(2) + ' Credits!');
    }
    return retVal;
}

var _emptyTerminal = function(terminal, soFar) {
    var thingsToSell = _.filter(Object.keys(terminal.store), (resource) => {return !dontSellList.includes(resource);});
    var sold = soFar;
    for(let i in thingsToSell) {
        if(sold >= maxPerTick) {
            break;
        }
        let resource = thingsToSell[i];
        if(terminal.store[resource] >= sellThreshold * 2) {
            if(_sellHighestPrice(resource, terminal) == OK){sold += 1;}
        }
    }
    return sold;
}

var _sell = function(soFar) {
    var sold = soFar;
    var terminals = _getTerminals();
    for(let i in terminals) {
        if(sold >= maxPerTick) {
            break;
        }
        sold = _emptyTerminal(terminals[i], sold);
    }
    return sold;
}

var _buy = function(soFar) {
    var bought = soFar;
    if(soFar < maxPerTick) {
        var lowestTokenOrder = _.min(Game.market.getAllOrders({type: ORDER_SELL, resourceType: SUBSCRIPTION_TOKEN}), (obj) => {return obj.price;});
        
        if(lowestTokenOrder.price <= (Game.market.credits * creditRatio)) {
            if(Game.market.deal(lowestTokenOrder.id, 1) == OK) {
                 Game.notify('Bought a subscription token!', 10);
                 bought++;
            }
        }
        
        for(var [resource, maxPrice, targetAmount, targetRoomName] of buyList) {
            if(bought >= maxPerTick) {
                break;
            }
            
            var room = Game.rooms[targetRoomName];
            if(!room || !room.terminal) {
                continue;
            }
            
            var currentAmount = 0;
            if(room.terminal.store[resource]) {
                currentAmount = room.terminal.store[resource];
            }
            
            if(currentAmount >= targetAmount) {
                continue;
            }
            
            var lowestOrder = _.min(Game.market.getAllOrders({type: ORDER_SELL, resourceType: resource}), (obj) => {return obj.price;});
            
            if(!lowestOrder || lowestOrder.price > maxPrice) {
                continue;
            }
            
            var amount = Math.min(lowestOrder.amount, targetAmount - currentAmount);
            if(Game.market.deal(lowestOrder.id, amount, targetRoomName) == OK) {
                console.log("Bought " + amount + " " + resource + " for $" + lowestOrder.price + " per unit, $" + (lowestOrder.price * amount) + " total.");
                bought++;
            }
        }
    }
    return bought;
}

var _trade = function() {
    var trades = 0;
    trades = _sell(trades);
    trades = _buy(trades);
}

module.exports = {
    trade: _trade,
    shouldTrade: _shouldTrade
};