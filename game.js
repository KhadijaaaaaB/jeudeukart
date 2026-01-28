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

var deck = shuffle()
// console.log(shuffled);

async function playTurn(player) {
    let staying = false;
    let busted = false;
    console.log(`\n--- ${player.name}'s Turn ---`);
    while (!staying && !busted) {
        // Draw a card from the deck
        let newCard = deck.pop();

        // Check for duplicates
        if (player.hand.some(card => card.value === newCard.value)) {
            const secondChanceIndex = player.hand.findIndex(card => card.type === "second_chance");
            if (secondChanceIndex !== -1) {
                console.log("Luckily, you get a Second Chance!");
                player.hand.splice(secondChanceIndex, 1); // remove seconde chance card
            }
            else {
                console.log("OH NO! BUSTED!");
                busted = true;
                player.roundScore = 0;
            }
        } else {
            // Add card to hand and show them
            player.hand.push(newCard);
            console.log(`You drew a ${newCard.value}! Current hand: ${player.hand.map(c => c.value).join(', ')}`);

            if (player.hand.filter(c => c.type === "number").length === 7) {
                console.log("FLIP 7! You get a 15 point bonus and the round ends!");
                player.score += 15; // The bonus
                return true;
            }

            const choice = await rl.question("Hit or Stay? ");
            if (choice.toLowerCase() === "stay") {
                staying = true;
            }
        }
    }
    let num = 0
    let mult = 1
    let bonus = 0
    for (let card of player.hand) {
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
    player.roundScore += num*mult+bonus;
    console.log(`${player.name} scored ${player.roundScore} points this round.`);
    return false;
}

async function mainGame() {
    let players = [
        {name:'Alyss', hand: [], roundScore:0, totalScore:0},
        {name:'Bob', hand: [], roundScore:0, totalScore:0},
    ]
    let gameOver = false;
    while (!gameOver) {
        for (let player of players) {
            player.hand = []; // Clear hand for the new round
            player.totalScore += player.roundScore;
            player.roundScore = 0; // Clear last round's score.
            let roundOver = await playTurn(player);
            if (roundOver) {
                break;
            }
        }
        // Check if anyone hit 200 after everyone has played their turn
        if (players.some(p => p.totalScore >= 200)) {
            gameOver = true;
        }
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
}

mainGame()