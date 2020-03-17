using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Web;

namespace SignalingServer.Hubs
{
    public class Hub1 : Hub
    {
        public static ConcurrentDictionary<string,string> clients = new ConcurrentDictionary<string, string>();
        static int msgIndex = 0;

        public override Task OnConnected()
        {
            string id;
            var rs = Context.QueryString["name"];
            clients.TryGetValue(rs, out id);
            if (string.IsNullOrEmpty(id))
            {
                clients.TryAdd(rs, Context.ConnectionId);
            }
            else
            {
                clients.TryUpdate(rs, Context.ConnectionId, id);
            }
            
            
            return base.OnConnected();
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            return base.OnDisconnected(stopCalled);
        }
             


        public void SendMsg(RtcMessage msg)
        {
            msg.msgIndex = msgIndex.ToString(); ;
            var rs = Context.QueryString["name"];
            msg.From = rs;
            string toId;
            clients.TryGetValue(msg.To, out toId);
            if (!string.IsNullOrEmpty(toId))
            {
                Clients.Client(toId).msgreceived(msg);
            }
            else
            {
                throw new Exception("error");
            }
            msgIndex++;
            //JsonConvert.SerializeObject
        }

    }

    public class RtcMessage
    {
        public string msgIndex { get; set; }

        public string Type { get; set; }

        public string To { get; set; }

        public string From { get; set; }

        public dynamic Data { get; set; }
    }
}