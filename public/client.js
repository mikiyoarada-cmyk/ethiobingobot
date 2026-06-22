const socket = io();


const cartelas=document.getElementById("cartelas");
const mycard=document.getElementById("mycard");
const last=document.getElementById("last");
const calledBox=document.getElementById("calledNumbers");
const countdown=document.getElementById("countdown");
const winnerBox=document.getElementById("winner");


let selectedCards=[];
let called=[];

let voiceReady=false;



document.getElementById("enableSound").onclick=function(){

voiceReady=true;

this.innerHTML="✅ SOUND ON";


let a=new Audio("/voices/B1.mp3");

a.volume=0.1;

a.play().catch(e=>console.log(e));


};






function getVoiceFile(number){


if(number>=1 && number<=15)
return "B"+number+".mp3";


if(number>=16 && number<=30)
return "I"+number+".mp3";


if(number>=31 && number<=45)
return "N"+number+".mp3";


if(number>=46 && number<=60)
return "G"+number+".mp3";


return "O"+number+".mp3";


}





function playVoice(number){


if(!voiceReady)return;


let sound=new Audio(
"/voices/"+getVoiceFile(number)
);


sound.play()
.catch(e=>console.log(e));


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


if(called.includes(number)){


style="background:green;color:white;font-weight:bold;";


}



if(number==="FREE"){

style="background:blue;color:white;";

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





box.onclick=function(){


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


showSelected();


});







function showSelected(){


mycard.innerHTML="";


selectedCards.forEach(card=>{


let h=document.createElement("h2");


h.innerHTML=
"SELECTED CARTELA "+card.id;



mycard.appendChild(h);



let area=document.createElement("div");


drawCard(card,area);



mycard.appendChild(area);



});


}







socket.on("number",(data)=>{


called=data.called;


last.innerHTML=data.number;


calledBox.innerHTML=
called.join(" , ");



playVoice(data.number);


showSelected();


});







socket.on("countdown",(data)=>{


countdown.innerHTML=
"Game starts in "+data.countdown+" seconds";


});







socket.on("gameStart",()=>{


called=[];


last.innerHTML="-";


calledBox.innerHTML="";


winnerBox.innerHTML="";


});








socket.on("winner",(data)=>{


winnerBox.innerHTML=

"🎉 GOOD BINGO! Winner Cartela "+data.cartela;


});







socket.on("gameEnd",()=>{


winnerBox.innerHTML+="<br>New game preparing...";


});