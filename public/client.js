const socket = io();


const cartelas = document.getElementById("cartelas");
const mycard = document.getElementById("mycard");
const last = document.getElementById("last");
const countdown = document.getElementById("countdown");
const calledNumbersBox = document.getElementById("calledNumbers");


let selectedCards = [];

let called = [];

let voiceReady = false;





// SOUND BUTTON

const soundButton=document.getElementById("enableSound");



if(soundButton){


soundButton.onclick=()=>{


voiceReady=true;


soundButton.innerHTML="✅ VOICE ON";



let test=new Audio("/voices/B1.mp3");


test.volume=0.05;


test.play().catch(e=>console.log(e));



};


}







function getVoiceFile(number){


if(number>=1 && number<=15){

return "B"+number+".mp3";

}


if(number>=16 && number<=30){

return "I"+number+".mp3";

}


if(number>=31 && number<=45){

return "N"+number+".mp3";

}


if(number>=46 && number<=60){

return "G"+number+".mp3";

}


if(number>=61 && number<=75){

return "O"+number+".mp3";

}


}







function playVoice(number){


if(!voiceReady){

return;

}



let file=getVoiceFile(number);



let audio=new Audio("/voices/"+file);



audio.volume=1;



audio.play()
.catch(err=>console.log(err));


}







function drawCard(card,element){


let html=`

<table>

<tr>

<th>B</th>
<th>I</th>
<th>N</th>
<th>G</th>
<th>O</th>

</tr>

`;



for(let r=0;r<5;r++){


html+="<tr>";



for(let c=0;c<5;c++){


let number=card.numbers[r*5+c];


let style="";



if(number==="FREE"){

style="background:blue;color:white;font-weight:bold;";

}


if(called.includes(number)){


style="background:green;color:white;font-weight:bold;";


}




html+=`

<td style="${style}">

${number}

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



drawCard(card,area);



box.appendChild(area);





box.onclick=()=>{



socket.emit("chooseCard",{


cardId:card.id


});



};





cartelas.appendChild(box);



});



});








socket.on("cardSelected",(card)=>{



if(!selectedCards.find(c=>c.id===card.id)){


selectedCards.push(card);


}



showMyCards();



});








function showMyCards(){



mycard.innerHTML="";



selectedCards.forEach(card=>{



let title=document.createElement("h3");



title.innerHTML="SELECTED CARTELA "+card.id;



mycard.appendChild(title);




let area=document.createElement("div");



drawCard(card,area);



mycard.appendChild(area);



});



}









socket.on("number",(data)=>{



called.push(data.number);



last.innerHTML=data.number;



calledNumbersBox.innerHTML=

called.join(" , ");




showMyCards();




playVoice(data.number);



});










socket.on("calledNumbers",(data)=>{



called=data.called || [];



calledNumbersBox.innerHTML=

called.join(" , ");



});








socket.on("countdown",(data)=>{


countdown.innerHTML=

"STARTING GAME IN "+data.countdown+" seconds";


});







socket.on("gameStart",()=>{



called=[];



last.innerHTML="-";



calledNumbersBox.innerHTML="";



countdown.innerHTML="GAME STARTED";



showMyCards();



});


socket.on("gameEnd",()=>{


countdown.innerHTML="GAME END";


});








socket.on("winner",(data)=>{


let text="🎉 GOOD BINGO 🎉<br>";


text += "Cartela Number: "+data.cartela;



mycard.innerHTML=

"<h1>"+text+"</h1>";



});








socket.on("clearGame",()=>{



// remove old called numbers

called=[];



last.innerHTML="-";



calledNumbersBox.innerHTML="";



// remove old selected cards

selectedCards=[];



mycard.innerHTML="";



// redraw all cartelas without green marks

let tables=document.querySelectorAll("table td");



tables.forEach(td=>{


td.style.background="";

td.style.color="";



});



countdown.innerHTML="WAITING FOR CARTELAS";



});








socket.on("cardTaken",(data)=>{



alert(data.message);



});
socket.on("pickedCount",(data)=>{


countdown.innerHTML=

"PLAYERS PICKED CARTELAS: "+data.count;



});







// refresh selected cards after browser reconnect

socket.on("connect",()=>{


console.log("Connected to bingo server");


});