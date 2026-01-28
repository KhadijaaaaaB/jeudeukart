const readline = require('readline/promises');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function create_deck() {
    let deck = []
    for (let i = 12; i >= 1 ; i--) {
        for (let count = 0 ; count <= i; count++) {
            deck.push({name: i.toString(), value: i, type: 'number'})
        }
    }
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

let deck = shuffle()
// TODO : add special cards
// console.log(shuffled);

async function playTurn(player, allPlayers){
    if (player.isOut || player.isStaying) return false;
    console.log(`\n--- ${player.name}'s Action ---`);
    console.log(`Current Hand: ${player.hand.map(c => c.value).join(', ')}`);

    let newCard = deck.pop();
    if (!newCard) { deck = shuffle(); newCard = deck.pop(); } // Deck safety

    // check for duplicates
    if (player.hand.some(card => card.value === newCard.value)) {
        const secondChanceIndex = player.hand.findIndex(card => card.type === "second_chance");
        if (secondChanceIndex !== -1) {
            console.log(`Drawn: ${newCard.value}. Luckily, you use a Second Chance!`);
            player.hand.splice(secondChanceIndex, 1);
        } else {
            console.log(`Drawn: ${newCard.value}. OH NO! BUSTED!`);
            player.isOut = true;
            player.hand = [];
            return false;
        }
    }

    // Special card : FREEZE
    if (newCard.type === "freeze") {
        console.log("FREEZE CARD DRAWN!");
        let activeOpponents = allPlayers.filter(p => p !== player && !p.isOut && !p.isStaying);
        let target;
        if (activeOpponents.length > 0) {
            const names = activeOpponents.map(p => p.name).join(", ");
            const targetName = await rl.question(`Who do you want to freeze? (${names}): `);
            target = allPlayers.find(p => p.name === targetName) || activeOpponents[0];
        } else {
            console.log("No one left to freeze, you freeze yourself!");
            target = player;
        }
        target.isOut = true;
        target.hand = [];
        console.log(`${target.name} is frozen out of the round!`);
        if (target === player) return false;
    }

    player.hand.push(newCard);
    console.log(`You drew a ${newCard.value}!`);

    // Flip 7 check
    if (player.hand.filter(c => c.type === "number").length === 7) {
        console.log("FLIP 7! 15 point bonus! Round ends!");
        player.totalScore += 15;
        return true; // Signal round end
    }

    const choice = await rl.question("Hit or Stay? ");
    if (choice.toLowerCase() === "stay") {
        player.isStaying = true;
    }

    return false;
}

async function mainGame() {
    let players = [
        {name:'Alyss', hand: [], roundScore:0, totalScore:0, isOut:false, isStaying:false},
        {name:'Bob', hand: [], roundScore:0, totalScore:0, isOut:false, isStaying:false},
    ]
    let gameOver = false;
    while (!gameOver) {
        players.forEach(p => {
            p.hand = [];
            p.isOut = false;
            p.isStaying = false;
        });

        let roundActive = true;
        while (roundActive) {
            for (let player of players) {
                if (!player.isOut && !player.isStaying) {
                    let flip7Triggered = await playTurn(player, players);

                    if (flip7Triggered) {
                        roundActive = false;
                        break;
                    }
                }
            }
            if (players.every(p => p.isOut && p.isStaying)) {
                roundActive = false;
            }
        }


        for (let player of players) {
            player.hand = []; // Clear hand for the new round
            player.isOut = false;
            player.totalScore += player.roundScore;
            player.roundScore = 0; // Clear last round's score.
            let roundOver = await playTurn(player, players);
            if (roundOver) {
                break;
            }
        }
        // Check if anyone hit 200 after everyone has played their turn
        if (players.some(p => p.totalScore >= 200)) {
            gameOver = true;
        }

        // Calculate Scores
        players.forEach(p => {
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
            console.log(`${p.name} scored ${p.roundScore} points this round.`);
        })

        if (players.some(p => p.totalScore >= 200)) gameOver = true;
    }

    let winner = players[0].name;
    let winner2 = ""
    let winning_score = players[0].totalScore;
    for (let player of players) {
        if (player.totalScore >= 200 && player.totalScore > winning_score) {
            winner = player.name;
            winning_score = player.totalScore;
        }
        if (player.totalScore === winning_score && player.name !== winner) {
            winner2 = player.name;
        }
    }
    if (winner2) {
        console.log(`The winners are ${winner} and ${winner2} with total score of ${winning_score}`)
    }
    else {
        console.log(`The winner is ${winner} with total score of ${winning_score}`)
    }
    console.log("Game Over!");
    rl.close();
}

mainGame()