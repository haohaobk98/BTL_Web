var socket = io("http://localhost:8083");
socket.on("gui-comment",function(data){
    $("#showcomment").append(data+"<br>");
})
socket.on("san-pham", function(data){
    for(var i =0;i<data.lenght;i++ )
    var ins = '<a href="/data._id"><img id="0" src="/imageMayTinh/<%= MayTinh[i].image%>" width="150px" height="150px"></a><br><span class ="ten" id = "ten-1"><%= MayTinh[i].name%></span><br><span class ="gia" id = "gia-1"><%= MayTinh[i].price%></span><br>' 
    $("#frame-1").append(ins);
})
$(document).ready(function(){
    socket.emit("list-sp");
    $("#like").click(function(){
        if( $("#like").attr("src")=="image/like.png")
       {
           $("#like").attr("src","image/like1.png")
        }
        else
        $("#like").attr("src","image/like.png")
    })
    $("#follow").click(function(){
        if( $("#follow").attr("src")=="image/unfollow.png")
       {
           $("#follow").attr("src","image/follow.png")
           $("#theodoi").html("Đã theo dõi");
           $("#theodoi").attr("style","color: blue")
        }
        else
       { 
           $("#follow").attr("src","image/unfollow.png");
           $("#theodoi").html("Theo dõi");
           $("#theodoi").attr("style","color: rgb(177, 174, 171)")
    }
    })
    $("#mota").show();
    $("#binhluan").hide();
    $("#mota").click(function(){
        mota();
    })
    $("#binhluan").click(function(){
        binhluan();
    })
    
    socket.emit("gui-thong-tin");
    $("#send").click(function(){
        socket.emit("gui-comment",$("#Comment").val());
    })
})
function binhluan(){
$("#mota").hide();
$("#binhluan").show();
}
function  mota(){
    $("#mota").show();
    $("#binhluan").hide();
}
const numberInput = $('#PhoneNumber').val(),
      Code = Math.random()*(9999-1000)+1000,
      button = $('.form-button'),
      response = document.querySelector('.response');

button.addEventListener('click', send, false);
socket.on('smsStatus', function(data){
  if(data.error){
    response.innerHTML = '<h5>Text message sent to ' + data.error + '</h5>';
  }else{
    response.innerHTML = '<h5>Text message sent to ' + data.number + '</h5>';
  }
});

let timeOut;
const getTimeSchedule = ({ time, number, text }) => {
  if(timeOut) clearTimeout(timeOut);
  timeOut = setTimeout(() => {
    fetchServer({ number, text });
  }, time * 60 * 1000);
};

const fetchServer = ({ number, text }) => {
  console.log('send');
  fetch('/', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ number, text })
  })
    .then(function (res) {
      console.log(res);
    })
    .catch(function (err) {
      console.log(err);
    });
};

function send() {
  const number = numberInput.value.replace(/\D/g, '');
  const text = textInput.value;
  const time = parseInt(scheduleSelect.value, 10);
  getTimeSchedule({ number, text, time });
}

