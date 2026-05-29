"use client";

interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { number: 1, label: "検索条件" },
  { number: 2, label: "シミュレーション" },
  { number: 3, label: "判定結果" },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                currentStep === step.number
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : currentStep > step.number
                  ? "bg-blue-100 text-blue-600 border-2 border-blue-300"
                  : "bg-slate-200 text-slate-400"
              }`}
            >
              {currentStep > step.number ? "✓" : step.number}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                currentStep === step.number
                  ? "text-blue-600"
                  : currentStep > step.number
                  ? "text-blue-400"
                  : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all ${
                currentStep > step.number ? "bg-blue-300" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
