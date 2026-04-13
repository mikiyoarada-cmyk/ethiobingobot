socket.on("phase",(p)=>{

  if(p==="picking"){
    alert("🟢 PICK YOUR CARTELAS (30 sec)");
  }

  if(p==="playing"){
    alert("🎮 GAME STARTED");
  }

  if(p==="waiting"){
    document.getElementById("status").innerText="WAIT FOR NEXT GAME";
  }
});

socket.on("winner",(w)=>{
  alert("🏆 WINNER: "+w.telegramName);

  console.log("Winning Numbers:",w.numbers);
});

socket.on("number",(n)=>{
  let audio = new Audio(`/voices/B${n}.mp3`);
  audio.play().catch(()=>{});
});