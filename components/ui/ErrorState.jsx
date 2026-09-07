export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
