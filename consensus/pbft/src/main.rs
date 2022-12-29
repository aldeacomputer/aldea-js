use std::collections::VecDeque;
use std::sync::mpsc;
use std::thread;
use std::thread::JoinHandle;
use std::time::Instant;

const F: usize = 3;
const N: usize = 3 * F + 1; // >=3F+1

#[derive(Debug)]
struct State {
    pub view: usize, // Primary is view % N
    pub block_number: usize,
}

#[derive(Debug)]
enum Message {
    ClientRequestNewBlock { timestamp: Instant },
}

fn spawn_validator(
    validator_index: usize,
    receiver: mpsc::Receiver<Message>,
    senders: Vec<mpsc::Sender<Message>>,
) -> JoinHandle<()> {
    thread::spawn(move || {
        let state = State {
            view: 0,
            block_number: 0,
        };

        let role = if state.view % N == validator_index {
            "Primary"
        } else {
            "Backup"
        };

        println!("Validator {} ({}): {:?}", validator_index, role, state);

        thread::sleep(std::time::Duration::from_millis(1000));

        drop(receiver);
        drop(senders);
    })
}

fn spawn_client(senders: Vec<mpsc::Sender<Message>>) -> JoinHandle<()> {
    thread::spawn(move || {
        let mut view = 0;

        let timestamp = Instant::now();
        let message = Message::ClientRequestNewBlock { timestamp };
        let validator_index = view % N;

        println!("Client: Send {:?}", message);

        senders[validator_index].send(message).unwrap();
    })
}

fn main() {
    let mut senders = vec![];
    let mut receivers = VecDeque::new();
    let mut join_handles = vec![];

    for validator_index in 0..N {
        let (sender, receiver) = mpsc::channel::<Message>();
        senders.push(sender);
        receivers.push_back(receiver);
    }

    for validator_index in 0..N {
        let receiver = receivers.pop_front().unwrap();
        let senders = senders.clone();
        join_handles.push(spawn_validator(validator_index, receiver, senders));
    }

    join_handles.push(spawn_client(senders));

    thread::sleep(std::time::Duration::from_millis(1000));

    join_handles
        .into_iter()
        .for_each(|join_handle| join_handle.join().unwrap())
}
