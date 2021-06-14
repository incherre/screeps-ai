import { ScreepsRequest } from '../requests/request';

export function shuffle(a: any[]): void {
    let j: number;
    let item: any;
    for(let i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        item = a[j];
        a[j] = a[i];
        a[i] = item;
    }
}

export function removeAt(array: any[], index: number): void {
    if(index < 0 || index >= array.length) {
        return;
    }

    // Replace the one to be removed with the last one.
    array[index] = array[array.length - 1];

    // Remove the last one.
    array.pop();
}

export function popMostImportant(requests: ScreepsRequest[]): ScreepsRequest | null {
    let min = Infinity;
    let index = -1;

    for(let i = 0; i < requests.length; i++) {
        if(requests[i].priority < min) {
            min = requests[i].priority;
            index = i;
        }
    }

    if(min !== Infinity && index >= 0) {
        const request = requests[index];
        removeAt(requests, index);
        return request;
    }
    else {
        return null;
    }
}
