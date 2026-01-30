const readline = require('readline/promises');
const fs = require('node:fs/promises');
const fsSync = require("fs");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function create_deck() {
    let action_cards = ["freeze", "flip_three", "second_chance"]
    let multiplier = 2
    let bonus = [2, 4, 6, 8, 10]
    let deck = []

    for (let i = 12; i >= 1 ; i--)
        for (let count = 0 ; count <= i; count++)
            deck.push({name: i.toString(), value: i, type: 'number'})

    for (let i = 0; i < action_cards.length; i++)
        for (let j = 0; j < 3; j++)
            // Convert snake case to title case too
            deck.push({name: action_cards[i].replace(/^_*(.)|_+(.)/g, (s, c, d) => c ? c.toUpperCase() : ' ' + d.toUpperCase()),
                value: action_cards[i], type: 'action'})

    for (let i = 0; i < bonus.length; i++)
        deck.push({name: "+"+bonus[i], value: bonus[i], type: 'bonus'})

    deck.push({name: "x"+multiplier, value: multiplier, type: 'multiplier'})
    deck.push({name: 0, value: 0, type: 'number'})
    return deck
}

function shuffle() {
    let deck = create_deck()
    for (let i = deck.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i+1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

async function logTurn(player) {
    try {
        const handValues = player.hand.map(c => c.name).join(', ');
        const timestamp = new Date().toISOString();

        const entry = `[${timestamp}] Player: ${player.name} | Hand: [${handValues}] | Points Gained: ${player.roundScore} | Total Score: ${player.totalScore}\n`;

        await fs.appendFile('game_history.log', entry);
    } catch (err) {
        console.error("Could not write to log file:", err);
    }
}

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
            console.log("No one left to freeze, you freeze yourself!");
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
        console.log("FLIP 7! 15 point bonus! Round ends!");
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

// Returns a list of players
async function initGame() {
    // Flush log file
    if (fsSync.existsSync("game_history.log"))
        await fs.unlink("game_history.log");

    const player_number = await rl.question("How many players? [2] ");
    const numPlayers = Number(player_number);

    // Default case
    if (!player_number.trim() || isNaN(numPlayers)) {
        console.log(`Defaulting to two players`);
        return [
            {name:'Alyss', hand: [], roundScore:0, totalScore:0, isOut:false, isStaying:false},
            {name:'Yassine', hand: [], roundScore:0, totalScore:0, isOut:false, isStaying:false},
        ]
    }
    
    let players = []
    for (let i = 1; i <= numPlayers; i++) {
        let player_name = await rl.question(`Name of player ${i}? `);
        if (!player_name.trim())
            player_name = `Player ${i}`;
        
        players.push({name: player_name, hand: [], roundScore:0, totalScore:0, isOut:false, isStaying:false})
    }
    
    return players;
}

async function mainGame() {
    let gameOver = false;
    let players = await initGame();

     while (!gameOver) {
        console.log('================================ NEW ROUND ================================')
        
        players.forEach(p => {
            p.hand = [];
            p.isOut = false;
            p.isStaying = false;
        });

        await initRound(players);

        let roundActive = true;
        while (roundActive) {
            for (let player of players) {
                if (!player.isOut && !player.isStaying) {
                    let flip7Triggered = await playTurn(player, players);
                    console.log();

                    if (flip7Triggered) {
                        roundActive = false;
                        break;
                    }
                }
            }
            
            if (players.every(p => p.isOut || p.isStaying))
                roundActive = false;
        }

        // Calculate Scores
        for (let p of players) {
            let num = 0
            let mult = 1
            let bonus = 0
            for (let card of p.hand) {
                if (card.type === "number") {
                    num += card.value;
                }
                if (card.type === "multiplier") {
                    mult *= card.value;
                }
                if (card.type === "bonus") {
                    bonus += card.value;
                }
            }
            p.roundScore = num * mult + bonus;
            p.totalScore += p.roundScore;
            await logTurn(p);
            console.log(`${p.name} scored ${p.roundScore} points this round. Total points: ${p.totalScore}`);
        }

        console.log();

        if (players.some(p => p.totalScore >= 200))
            gameOver = true;
    }

    let winner = players[0].name;
    let winner2 = ""
    let winning_score = players[0].totalScore;
    for (let player of players) {
        if (player.totalScore >= 200 && player.totalScore > winning_score) {
            winner = player.name;
            winning_score = player.totalScore;
        }
        
        if (player.totalScore === winning_score && player.name !== winner)
            winner2 = player.name;
    }
    
    if (winner2)
        console.log(`The winners are ${winner} and ${winner2} with total score of ${winning_score}`)
    else
        console.log(`The winner is ${winner} with total score of ${winning_score}`)
    
    console.log("Game Over!");
    rl.close();
}

(async () => {
    try {
        await mainGame();
    } catch (error) {
        if (error.code === "ABORT_ERR")
            console.error("\nError:", error.code);
        else
            console.error(error.message);

        rl.close();
    }
})();
