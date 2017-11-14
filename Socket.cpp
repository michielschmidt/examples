#include "Socket.h"

Socket::Socket(int port, int maxDataSize, int logLevel)
{        
    // port = port we're listening on
    // maxdatasize = max number of bytes we can get at once            
    this->port = port;
    this->maxDataSize = maxDataSize;                     
    this->logLevel = logLevel;
    
    backlog = 10;
    int yes=1;        // for setsockopt() SO_REUSEADDR, below
    int rv;
    
    FD_ZERO(&master);    // clear the master and temp sets
    FD_ZERO(&read_fds);

    // get us a socket and bind it
    memset(&hints, 0, sizeof hints);
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = AI_PASSIVE;
    
    std::stringstream sstr;
    sstr << this->port;
    std::string str_port = sstr.str();
    
    if((rv = getaddrinfo(NULL, str_port.c_str(), &hints, &ai)) != 0) 
    {
        fprintf(stderr, "server: %s\n", gai_strerror(rv));
        exit(1);
    }
    
    for(p=ai; p!=NULL; p=p->ai_next) 
    {
        listener = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
        if(listener < 0) 
        { 
            continue;
        }
        
        // lose the pesky "address already in use" error message
        setsockopt(listener, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(int));

        if(bind(listener, p->ai_addr, p->ai_addrlen) < 0) 
        {
            close(listener);
            continue;
        }

        break;
    }    
    
     // if we got here, it means we didn't get bound
    if(p == NULL) 
    {
        fprintf(stderr, "server: failed to bind\n");
        exit(2);
    }

    freeaddrinfo(ai); // all done with this

    // listen
    if(listen(listener, backlog) == -1) 
    {
        perror("listen");
        exit(3);
    }
    
    // add the listener to the master set
    FD_SET(listener, &master);

    // keep track of the biggest file descriptor
    fdmax = listener; // so far, it's this one           
}

int Socket::Send(int socket, const char *buf)
{
    //cout << "RAW DATA: " << buf << endl;
    
    int len;
    len = strlen(buf);

    int total = 0;        // how many bytes we've sent
    int bytesleft = len; // how many we have left to send
    int n;

    while(total < len) 
    {
        n = send(socket, buf+total, bytesleft, 0);
        if (n == -1)
        { 
            perror("send");
            fprintf(stderr, "--> Error sending data %d\n", errno);        
                
            break;
        }
        
        total += n;
        bytesleft -= n;
    }

    len = total; // return number actually sent here

    return n==-1 ? -1 : 0; // return -1 on failure, 0 on success
}

int Socket::Receive(int socket, char *buf)
{
    int ret = recv(socket, buf, maxDataSize, 0);
    if(ret == 1)
    {
        perror("recv");
        fprintf(stderr, "<-- error receiving data %d\n", errno);
    }else
    {
        buf[ret] = '\0';
    }
    
    return ret;
}

int Socket::GetNextSocket(int socketId, char* buf)
{    
    if(socketId == 0)
    {
        InitPolling();
    }
    
    int nbytes;    
    
    if(FD_ISSET(socketId, &read_fds))
    {
        // we got one!!
        if(socketId == listener)
        {
            // handle new connections
            addrlen = sizeof remoteaddr;
            newfd = accept(listener, (struct sockaddr *)&remoteaddr, &addrlen);

            if(newfd == -1)
            {
                perror("accept");
            }else 
            {
                FD_SET(newfd, &master); // add to master set
                if(newfd > fdmax)
                { 
                    // keep track of the max
                    fdmax = newfd;
                }                    

                const char* ip_str = inet_ntop(remoteaddr.ss_family,
                        &((struct sockaddr_in*)&remoteaddr)->sin_addr, remoteIP, INET6_ADDRSTRLEN);
                
                sprintf(buf, "%s on socket %d", ip_str, newfd);                
                
                return 2;                
            }
        }else 
        {
            // handle data from a client 
            nbytes = Receive(socketId, buf);
            if(nbytes > 0)
            {
                // we got some data from a client
                // null-terminated string
                buf[nbytes] = '\0';   
                               
                return 1;                                
            }else
            {
                // got error or connection closed by client
                if(nbytes != 0) 
                {
                    //perror("recv");
                }
                
                sprintf(buf, "%d", nbytes);

                close(socketId); // bye!
                FD_CLR(socketId, &master); // remove from master set
                
                return 3;
            }
        }
    }
}

void Socket::InitPolling()
{
    read_fds = master; // copy it
    if(select(fdmax+1, &read_fds, NULL, NULL, NULL) == -1)
    {
        perror("select");
        exit(4);
    }
}
