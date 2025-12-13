export type SchedulerState = {
	easeFactor: number;
	consecutiveCorrect?: number;
};

export function calculateNextReview(
	current: SchedulerState,
	performanceRating: number,
): { nextDate: Date; newEaseFactor: number } {
	const today = new Date();
	const rating = Math.max(0, Math.min(5, performanceRating));
	let ef = current.easeFactor;
	ef = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
	if (ef < 1.3) ef = 1.3;

	let intervalDays = 1;
	const streak = current.consecutiveCorrect ?? 0;
	if (rating >= 3) {
		if (streak <= 1) intervalDays = streak === 0 ? 1 : 6;
		else intervalDays = Math.round((streak + 1) * ef);
	} else {
		intervalDays = 1;
	}

	const next = new Date(today.getTime());
	next.setDate(today.getDate() + intervalDays);
	return { nextDate: next, newEaseFactor: ef };
}
