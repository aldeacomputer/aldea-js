// Learnings
// - PREPREPARE messages are used to totally order requests. But this isn't
//   needed for block consensus because order is known and requests always come
//   from a leader.

use std::collections::VecDeque;
use std::sync::mpsc;
use std::thread;
use std::thread::JoinHandle;
use std::time::Instant;

const F: usize = 3; // Max number of faulty nodes
const N: usize = 3 * F + 1; // Number of nodes which must be >=3F+1

// State that is being agreed upon by nodes.
#[derive(Debug)]
struct ServiceState {
    pub block_number: usize, // In our simulation, this is what we are agreeing on.
}

// Validator state
#[derive(Debug)]
struct ReplicaState {
    pub replica_index: usize,
    pub view: usize,                 // Primary (leader) is view % N
    pub service_state: ServiceState, // State of the service
    pub message_log: Vec<Message>,   // Historical messages agreed upon
}

// A request message sent from clients to change the state.
#[derive(Debug)]
enum ClientRequest {
    NewBlock,
}

// A message sent from clients to nodes or nodes to other nodes.
#[derive(Debug)]
enum Message {
    // A request sent from clients to nodes.
    Request {
        client_index: usize,
        client_request: ClientRequest,
        timestamp: Instant,
    },

    // reply from nodes to the client.
    Reply {
        view: usize,
        request_timestamp: Instant,
        client_index: usize,
        replica_index: usize,
        result: usize, // TODO: What is this data?
    },

    // Exits the thread
    Exit,
}

fn spawn_replica(
    replica_index: usize,
    receiver: mpsc::Receiver<Message>,
    senders: Vec<mpsc::Sender<Message>>,
) -> JoinHandle<()> {
    thread::spawn(move || {
        let state = ReplicaState {
            replica_index,
            view: 0,
            service_state: ServiceState { block_number: 0 },
            message_log: vec![],
        };

        fn role(state: &ReplicaState) -> String {
            if state.view % N == state.replica_index {
                "Primary".to_string()
            } else {
                "Backup".to_string()
            }
        }

        println!("Replica {} ({}): Starting", replica_index, role(&state));

        while let Ok(message) = receiver.recv() {
            println!(
                "Replica {} ({}): Receive {:?}",
                replica_index,
                role(&state),
                message
            );

            match message {
                Message::Exit => break,

                _ => panic!("Unknown message: {:?}", message),
            }
        }

        drop(senders);
    })
}

fn spawn_client(client_index: usize, senders: Vec<mpsc::Sender<Message>>) -> JoinHandle<()> {
    thread::spawn(move || {
        let mut view = 0;

        let timestamp = Instant::now();
        let client_request = ClientRequest::NewBlock;
        let message = Message::Request {
            client_index,
            client_request,
            timestamp,
        };
        let replica_index = view % N;

        println!("Client{}: Send {:?}", client_index, message);

        senders[replica_index].send(message).unwrap();
    })
}

fn main() {
    let mut replica_senders = vec![];
    let mut replica_receivers = VecDeque::new();
    let mut join_handles = vec![];

    for replica_index in 0..N {
        let (sender, receiver) = mpsc::channel::<Message>();
        replica_senders.push(sender);
        replica_receivers.push_back(receiver);
    }

    for replica_index in 0..N {
        let receiver = replica_receivers.pop_front().unwrap();
        let replica_senders = replica_senders.clone();
        let replica_join_handle = spawn_replica(replica_index, receiver, replica_senders);
        join_handles.push(replica_join_handle);
    }

    let client_join_handle = spawn_client(0, replica_senders.clone());
    join_handles.push(client_join_handle);

    replica_senders
        .iter()
        .for_each(|sender| sender.send(Message::Exit).unwrap());

    join_handles
        .into_iter()
        .for_each(|join_handle| join_handle.join().unwrap())
}
