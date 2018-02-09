var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    mongoose = require("mongoose");
    users={};
    
    server.listen(4000);
    
    app.get('/',function (req,res){
        res.sendFile(__dirname+"/index.html");
    });
    
    mongoose.connect("mongodb://localhost/chat",function(err){ // 기본포트 : 27017 , localhost 와 db선택 
        if(err)
        {
            console.log(err);
        }
        console.log("MongoDb connected!");
    })
    var schema = mongoose.Schema({
        nick : String,
        msg : String,
        date :{type:Date,default: Date.now}
    });
    var model = mongoose.model('message',schema);
    
    io.sockets.on('connection',function(socket){
        //검색조건 넣을땐 model.find({nick:'a'}) , find({}는 모두 가져옴 
//        model.find({},function(err,data){
//            if(err)throw err;
//            socket.emit("load old msg",data);
//        })
        var msgs = model.find({});
        // limit : msgs.sort("-created").limit(8).exec
        // - 는 desc , default : asc 
        msgs.sort("-created").exec(function(err,data){
            if(err)
            {
                throw err;
                alert("에러 발생 :"+err);
            }         
            socket.emit("load old msg",data);
        })
        
        socket.on("new user",function(data,callback){ // 유저 추가 
            if(data in users){// 일치하는 값이 없을때 -1반환 
                callback(false);
            }else{
                callback(true);      
                socket.user = data;
                users[socket.user]=socket;
                UpdateUsers();
            }
        })
                
        socket.on('send message',function(data,callback){
            var msg = data.trim();
            if (msg.slice(0, 3) === "/w ")
            {              
                var msg = msg.slice(3);
                var name = msg.slice(0, msg.indexOf(" "));
                var ind = msg.indexOf(" ");
                if(ind != -1){
                    if(name in users)
                    {
                       console.log("yes");
                       var content = msg.slice(msg.indexOf(" ") + 1);
                       users[name].emit("whisper",{user:name,data:content});
                       socket.emit('new message',{user:socket.user+" -> " + name,data:content});
                    }else{
                        callback("접속중인 유저가 아닙니다.");
                    }
                }else{
                    callback("메세지를 입력해주세요.");
                }
            }else{
                var newMsg = new model({nick:socket.user,msg:data});
                newMsg.save(function(err){
                    if(err) throw err;
                    io.sockets.emit('new message',{user:socket.user,data:data});
                })
            }
            // 메세지 발신자를 제외한 모두에게 답장
//            socket.broadcast.emit('new message',data)
        });
        
        socket.on("disconnect",function(data){
            if(!socket.user) return;
//            users.splice(users.indexOf(socket.user),1); // 1. 어느 위치부터 , 2. 몇개의 원소를 삭제
            delete(users[socket.user]);
            UpdateUsers();
        })
        
        function UpdateUsers(){
           io.sockets.emit("users",Object.keys(users));
        };
    });
    
    