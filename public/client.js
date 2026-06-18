const socket = io();

const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");

let userId = Math.floor(Math.random() * 999999);

let selectedCard = null;
let called = [];



socket.on("countdown", (data) => {

    countdown.innerHTML =
    "Game starts in: " + data.countdown + " seconds";

});



function drawCard(card, element) {

    let html = `
    <table>
    <tr>
    <th>B</th>
    <th>I</th>
    <th>N</th>
    <th>G</th>
    <th>O</th>
    </tr>
    `;


    for(let i = 0; i < 25; i += 5) {

        html += "<tr>";

        for(let j = 0; j < 5; j++) {

            let number = card.numbers[i+j];

            let mark = "";


            if(called.includes(number)) {
                mark = "marked";
            }


            if(number === "FREE") {
                mark = "free";
            }


            html += `
            <td class="${mark}">
            ${number}
            </td>
            `;

        }

        html += "</tr>";

    }


    html += "</table>";

    element.innerHTML = html;

}




socket.on("cardsList", (cards) => {


    cartelas.innerHTML = "";


    cards.forEach((card) => {


        let box = document.createElement("div");

        box.className = "cartela";


        box.innerHTML =
        "<h3>Cartela " + card.id + "</h3>";



        let area = document.createElement("div");


        drawCard(card, area);


        box.appendChild(area);



        box.onclick = () => {


            selectedCard = card;


            socket.emit(
                "chooseCard",
                {
                    userId:userId,
                    cardId:card.id
                }
            );


        };


        cartelas.appendChild(box);


    });


});






socket.on("cardSelected", (card) => {


    selectedCard = card;

    showMyCard();


});







function showMyCard(){


    if(!selectedCard) return;


    mycard.innerHTML =
    "<h2>Your Cartela " + selectedCard.id + "</h2>";



    let area = document.createElement("div");


    drawCard(selectedCard, area);


    mycard.appendChild(area);


}







socket.on("number", (data) => {


    let number = data.number;


    called.push(number);


    last.innerHTML = number;



    // play recorded voice
    let voice = new Audio(
        "/voices/" + number + ".mp3"
    );


    voice.play();



    showMyCard();



});







socket.on("gameStart", () => {


    called = [];


    if(selectedCard){

        showMyCard();

    }


});