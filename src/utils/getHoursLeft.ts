export function getHoursLeft(precision: number = 5, expiration: string | Date) {
    let oHours = '00',
        oMin = '00',
        oSec = '00';
    const y: any = expiration instanceof Date ? expiration : new Date(expiration);
    const x: any = new Date();
    if (y - x > 0) {
        const hours = Math.floor((y - x) / 1000 / 60 / 60);
        const days = Math.round(hours / 24);
        const months = Math.round(days / 30);
        if (hours < 24) {
            const minutes = Math.floor((y - x) / 1000 / 60 - hours * 60);
            const secs = Math.floor((y - x) / 1000 - hours * 60 * 60 - minutes * 60);

            oHours = (hours < 10 ? '0' : '') + hours;
            oMin = (minutes < 10 ? '0' : '') + minutes;
            oSec = (secs < 10 ? '0' : '') + secs;
            if (hours < 0) oHours = '00';
            if (minutes < 0) oMin = '00';
            if (secs < 0) oSec = '00';
            // console.log('Expiration', this.wl_data.username, this.wl_data.expiration, hours, minutes, secs, oHours, oMin, oSec);
            return oHours + ':' + oMin + ':' + oSec;
        } else if (months <= 0) {
            return days + ' days';
        } else return months + ' months';
    }
    return '';
}