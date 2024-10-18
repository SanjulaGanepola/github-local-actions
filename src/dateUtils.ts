export namespace DateUtils {
    /**
     * Get date time string.
     * 
     * Example: Oct 17, 2024, 11:26:47 PM EDT
     */
    export function getDateString(value?: string) {
        const date = value ? new Date(value) : new Date();

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: "numeric",
            hour12: true,
            timeZoneName: 'short'
        });
    }

    /**
     * Get time duration in minutes and seconds.
     * 
     * Examples: 31s or 2m 52s
     */
    export function getTimeDuration(startValue: string, endValue: string) {
        const start = new Date(startValue).getTime();
        const end = new Date(endValue).getTime();

        const totalSeconds = Math.floor((end - start) / 1000);
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        }

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }
}