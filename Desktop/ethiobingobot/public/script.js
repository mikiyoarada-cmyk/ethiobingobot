async function callNumber() {
  const res = await fetch('/call');
  const data = await res.json();

  document.getElementById('numbers').innerText =
    data.calledNumbers.join(', ');

  document.getElementById('winners').innerText =
    data.winners.length > 0 ? data.winners.join(', ') : 'No winners yet';
}

// load cards
async function loadCards() {
  const res = await fetch('/cards');
  const cards = await res.json();

  let html = '';

  cards.slice(0, 10).forEach(c => {
    html += '<div class="card">';
    c.card.forEach(row => {
      html += '<div>' + row.join(' ') + '</div>';
    });
    html += '</div><br>';
  });

  document.getElementById('cards').innerHTML = html;
}

loadCards();