/*
This is the controller for the automated trading portion of my screeps AI.
The practical maximum of the energy costs is 2 * amount_traded.

Some stuff:
{
    let terminal = Game.spawns['Spawn1'].room.terminal;
    let resource = Object.keys(terminal.store)[1];
    let amount = terminal.store[resource];
    let highestOrder = _.max(Game.market.getAllOrders({type: ORDER_BUY, resourceType: resource}), (obj) => {return obj.price;});
    let ret = Game.market.deal(highestOrder.id, Math.min(amount, highestOrder.amount), terminal.room.name);
    if(ret == OK){
        console.log('You just gained ' + (Math.min(amount, highestOrder.amount) * highestOrder.price) + ' Credits');
    }
}
*/

// ***** Options *****
var cpuThreshold = 3;
var sellThreshold = 8000;
var maxPerTick = 10;
// ***** End *****

var _getTerminals = function(){
    if(!Game.hasOwnProperty('TERMINALS')){
         Game.TERMINALS = [];
         for(let i in Game.rooms){
             if(Game.rooms[i].terminal != undefined && Game.rooms[i].terminal.my){
                Game.TERMINALS.push(Game.rooms[i].terminal);
             }
         }
    }
    return Game.TERMINALS;
}

var _shouldTrade = function(){
    return Game.time % 11 == 0 && _getTerminals().length > 0 && Game.cpu.getUsed() < (Game.cpu.limit - cpuThreshold);
}

var _sellHighestPrice = function(resource, terminal){
    var myAmount = terminal.store[resource];
    var highestOrder = _.max(Game.market.getAllOrders({type: ORDER_BUY, resourceType: resource}), (obj) => {return obj.price;});
    var retVal = Game.market.deal(highestOrder.id, Math.min(myAmount, highestOrder.amount), terminal.room.name);
    if(retVal == OK){
        console.log('You just gained ' + (Math.min(myAmount, highestOrder.amount) * highestOrder.price).toFixed(2) + ' Credits!');
    }
    return retVal;
}

var _emptyTerminal = function(terminal, soFar){
    var thingsToSell = _.filter(Object.keys(terminal.store), (resource) => {return resource != RESOURCE_ENERGY;});
    var sold = soFar;
    for(let i in thingsToSell){
        if(sold >= maxPerTick){
            break;
        }
        let resource = thingsToSell[i];
        if(terminal.store[resource] >= sellThreshold){
            if(_sellHighestPrice(resource, terminal) == OK){sold += 1;}
        }
    }
    return sold;
}

var _sell = function(soFar){
    var sold = soFar;
    var terminals = _getTerminals();
    for(let i in terminals){
        if(sold >= maxPerTick){
            break;
        }
        sold = _emptyTerminal(terminals[i], sold);
    }
    return sold;
}

var _buy = function(soFar){
    if(soFar < maxPerTick){
        var lowestTokenOrder = _.min(Game.market.getAllOrders({type: ORDER_SELL, resourceType: SUBSCRIPTION_TOKEN}), (obj) => {return obj.price;});
        
        if(lowestTokenOrder.price <= Game.market.credits){
            if(Game.market.deal(lowestTokenOrder.id, 1) == OK){
                 Game.notify('Bought a subscription token!', 10);
            }
        }
    }
}

var _trade = function(){
    var trades = 0;
    trades = _sell(trades);
    trades = _buy(trades);
}

module.exports = {
    trade: _trade,
    shouldTrade: _shouldTrade
};