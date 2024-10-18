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
     * Get time duration in seconds.
     */
    export function getTimeDuration(startValue: string, endValue: string) {
        const start = new Date(startValue).getTime();
        const end = new Date(endValue).getTime();
        return ((end - start) / 1000).toFixed(0).toString();
    }
}