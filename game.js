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

var shuffled = shuffle()
// console.log(shuffled);

async function playTurn(player) {
    let staying = false;
    let busted = false;
    while (!staying && !busted) {
        // Draw a card from the deck
        let newCard = deck.pop();

        // Check if the player already has this card value
        if (player.hand.some(card => card.value === newCard.value)) {
            console.log("OH NO! BUSTED!");
            busted = true;
            player.score = 0;
        } else {
            // Add card to hand and show them
            player.hand.push(newCard);
            console.log(`You drew a ${newCard.value}!`);

            if (player.hand.filter(c => c.type === "number").length === 7) {
                console.log("FLIP 7! You get a 15 point bonus and the round ends!");
                player.score += 15; // The bonus
                staying = true; // Ends the loop
                // TODO : end round for everyone.
            }

            const choice = await rl.question("Hit or Stay? ");
            if (choice.toLowerCase() === "stay") {
                staying = true;
            }
        }
    }
    var num = 0
    var mult = 1
    var bonus = 0
    for (card of player.hand) {
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
    player.score += num*mult+bonus;
}

let players = [
    {name:'Alyss', hand: [], roundScore:0, totalScore:0},
    {name:'Bob', hand: [], roundScore:0, totalScore:0},
]

async function mainGame() {
    let gameOver = false;
    while (!gameOver) {
        for (let player of players) {
            player.hand = []; // Clear hand for the new round
            player.totalScore += player.roundScore;
            player.roundScore = 0; // Clear last round's score.
            await playTurn(player);
        }

        // Check if anyone hit 200 after everyone has played their turn
        if (players.some(p => p.totalScore >= 200)) {
            gameOver = true;
        }
    }
    // TODO : Find the winner with the max score!
}
