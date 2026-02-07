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

module.exports = { shuffle };