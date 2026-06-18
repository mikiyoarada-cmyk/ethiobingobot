const socket=io();


const cartelas=document.getElementById("cartelas");
const mycard=document.getElementById("mycard");
const last=document.getElementById("last");
const countdown=document.getElementById("countdown");


let selectedCard=null;

let called=[];




socket.on("countdown",(d)=>{

countdown.innerHTML=
"START IN "+d.countdown;

});





function show(card,element){


let html="<table>";

html+=`
<tr>
<th>B</th>
<th>I</th>
<th>N</th>
<th>G</th>
<th>O</th>
</tr>
`;



for(let i=0;i<25;i+=5){


html+="<tr>";

for(let j=0;j<5;j++){


let n=card.numbers[i+j];


let color="";


if(called.includes(n)){

color="green";

}


if(n==="FREE"){

color="yellow";

}



html+=
`
<td style="
background:${color};
color:black;
">
${n}
</td>
`;



}


html+="</tr>";

}



html+="</table>";

element.innerHTML=html;


}









socket.on("cardsList",(cards)=>{


cartelas.innerHTML="";


cards.forEach(card=>{


let box=document.createElement("div");


box.className="cartela";


box.innerHTML=
"<h3>Cartela "+card.id+"</h3>";



let area=document.createElement("div");


show(card,area);



box.appendChild(area);



box.onclick=()=>{


selectedCard=card;


socket.emit(
"chooseCard",
{
cardId:card.id
}
);


showMyCard();


};



cartelas.appendChild(box);



});



});








socket.on("selected",(data)=>{


selectedCard=data.card;


called=data.called;


showMyCard();


});







function showMyCard(){


if(!selectedCard)return;


mycard.innerHTML="";


let title=document.createElement("h2");


title.innerHTML=
"Selected Cartela "+selectedCard.id;



mycard.appendChild(title);



let area=document.createElement("div");


show(selectedCard,area);


mycard.appendChild(area);



}







socket.on("number",(data)=>{


called=data.called;


last.innerHTML=data.number;



if(selectedCard){

showMyCard();

}



// play matching voice

let audio=new Audio(
"/voices/"+data.number+".mp3"
);


audio.play();



});







socket.on("gameStart",()=>{


called=[];


if(selectedCard){

showMyCard();

}


});