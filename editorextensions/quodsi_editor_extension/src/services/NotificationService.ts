/**
 * Service for managing user notifications in the LucidChart environment
 */
export class NotificationService {
    private static instance: NotificationService;

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Shows an informational message
     */
    public showMessage(message: string): void {
        console.log('Info:', message);
        // TODO: Implement actual LucidChart notification
    }

    /**
     * Shows a warning message
     */
    public showWarning(message: string): void {
        console.warn('Warning:', message);
        // TODO: Implement actual LucidChart notification
    }

    /**
     * Shows an error message
     */
    public showError(message: string): void {
        console.error('Error:', message);
        // TODO: Implement actual LucidChart notification
    }
}
