export function toHex(data) {
    return data.reduce((hex, byte) => {
        return hex + ('0' + byte.toString(16)).slice(-2);
    }, '');
}
