const readline = require('readline/promises');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const { shuffle } = require('./deck');
let deck = shuffle()

// Return true if we wanna bypass asking player whether to hit or stay
async function drawCard(player, allPlayers) {
    let newCard = deck.pop();
    console.log(`You drew a ${newCard.name}`)

    // Check for duplicates, bust player or give them a second chance
    if (player.hand
        .filter(card => card.type === "number")
        .some(card => newCard.type ==="number" && card.value === newCard.value))
    {
        const secondChanceIndex = player.hand.findIndex(card => card.value === "second_chance");
        if (secondChanceIndex !== -1) {
            console.log(`Drawn: ${newCard.value}. Luckily, you use a Second Chance!`);
            player.hand.splice(secondChanceIndex, 1);
            return false;
        } else {
            player.isOut = true;
            player.hand = [];
            await rl.question("OH NO! BUSTED!");
            return true;
        }
    }

    player.hand.push(newCard);

    // Special card : FREEZE
    if (newCard.value === "freeze") {
        console.log("FREEZE CARD DRAWN!");
        let activeOpponents = allPlayers.filter(p => p !== player && !p.isOut && !p.isStaying);
        let target;

        // Choose player to freeze - might be ourselves if everyone busted
        if (activeOpponents.length > 0) {
            const names = activeOpponents.map(p => p.name).join(", ");
            const targetName = await rl.question(`Who do you want to freeze? (${names}): `);
            target = allPlayers.find(p => p.name === targetName) || activeOpponents[0];
            console.log(`${target.name} is frozen out of the round!`);
        } else {
            await rl.question("No one left to freeze, you freeze yourself!");
            target = player;
        }

        target.isOut = true;
        target.hand = [];
        return target === player;
    }

    if (newCard.value === "flip_three")
        for (let i = 0; i < 3; i++)
            if (await drawCard(player, allPlayers))
                return true;

    // Flip 7 check
    if (player.hand.filter(c => c.type === "number").length === 7) {
        await rl.question("FLIP 7! 15 point bonus! Round ends!");
        player.totalScore += 15;
        allPlayers.forEach((p) => { p.isOut = true; });
        return true;
    }
}

// Returning true indicates the end of the round
async function playTurn(player, allPlayers) {
    if (player.isOut || player.isStaying) return false;

    // Log player's name in the correct format
    if (player.name.substr(player.name.length - 1) === 's')
        console.log(`--- ${player.name}' Action ---`);
    else
        console.log(`--- ${player.name}'s Action ---`);

    console.log(`Current Hand: ${player.hand.map(c => c.name).join(', ')}`);
    if (await drawCard(player, allPlayers))
        return false;

    const choice = await rl.question("Hit or Stay (s)? [default: hit] ");
    if (choice.toLowerCase().substring(0, 1) === "s")
        player.isStaying = true;

    return false;
}

async function initRound(players) {
    for (let i = 0; i < players.length; i++) {
        console.log(`${players[i].name}, here is your first card:`)
        await drawCard(players[i], players);
    }

    console.log()
}

module.exports = { drawCard, playTurn, initRound }