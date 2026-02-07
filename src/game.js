const readline = require('readline/promises');
const fs = require('node:fs/promises');
const fsSync = require("fs");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const { drawCard, playTurn, initRound } = require('./round');


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
