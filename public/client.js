const socket = io();


const cartelas=document.getElementById("cartelas");
const mycard=document.getElementById("mycard");
const last=document.getElementById("last");
const countdown=document.getElementById("countdown");
const calledBox=document.getElementById("calledNumbers");


let selectedCards=[];
let called=[];


let voiceReady=false;



// SOUND BUTTON

const soundButton=document.getElementById("enableSound");


soundButton.onclick=()=>{

voiceReady=true;

soundButton.innerHTML="✅ SOUND ON";


let test=new Audio("/voices/B1.mp3");

test.volume=0.2;

test.play().catch(e=>console.log(e));


};





function getVoiceFile(number){


if(number<=15)
return "B"+number+".mp3";


if(number<=30)
return "I"+number+".mp3";


if(number<=45)
return "N"+number+".mp3";


if(number<=60)
return "G"+number+".mp3";


return "O"+number+".mp3";


}





function playVoice(number){


if(!voiceReady)return;


let audio=new Audio(
"/voices/"+getVoiceFile(number)
);


audio.volume=1;


audio.play()
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


let mark="";


if(called.includes(number)){

mark="marked";

}


if(number==="FREE"){

mark="free";

}



html+=`

<td class="${mark}">
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


if(selectedCards.find(c=>c.id===card.id))
return;



selectedCards.push(card);



socket.emit("chooseCard",{

cardId:card.id

});



showMyCards();



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


let title=document.createElement("h2");


title.innerHTML="SELECTED CARTELA "+card.id;



mycard.appendChild(title);



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



showMyCards();



});







socket.on("calledNumbers",(data)=>{


called=data.called||[];


calledBox.innerHTML=
called.join(" , ");



});








socket.on("countdown",(data)=>{


countdown.innerHTML=
"Game starts in "+data.countdown+" seconds";


});








socket.on("gameStart",()=>{


called=[];


last.innerHTML="-";


calledBox.innerHTML="";


});








socket.on("winner",(data)=>{


alert(
"🎉 GOOD BINGO!\nWinner Cartela: "+data.cartela
);


document.getElementById("winner")
.innerHTML=
"🎉 GOOD BINGO! Winner Cartela "+data.cartela;


});







socket.on("gameEnd",()=>{


document.getElementById("winner")
.innerHTML=
"Game ended";


});