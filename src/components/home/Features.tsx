import React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon, title, description }, ref) => (
    <div ref={ref} className="w-[395px] shadow-[0_4px_6px_rgba(0,0,0,0.1),0_10px_15px_rgba(0,0,0,0.1)] bg-white p-6 rounded-lg max-md:w-[300px] max-sm:w-full max-sm:max-w-[400px]">
      <div className="w-6 h-6 mb-4">{icon}</div>
      <div>
        <h3 className="text-xl font-semibold text-black mb-4">{title}</h3>
        <p className="text-base text-gray-600">{description}</p>
      </div>
    </div>
  )
);

FeatureCard.displayName = "FeatureCard";

export const Features = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    return (
      <section ref={ref} className="bg-gray-50 px-20 py-16 max-sm:p-4" {...props}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold leading-[30px] text-gray-900 mb-3.5">
            Key Features
          </h2>
          <p className="text-base leading-4 text-gray-600">
            Everything you need for efficient time tracking
          </p>
        </div>
        <div className="max-w-screen-xl flex gap-8 justify-center mx-auto my-0 max-md:px-10 max-md:py-0 max-sm:flex-col max-sm:items-center">
          <FeatureCard
            icon={
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.98906 3.0375L6.50156 4.5H3C1.34531 4.5 0 5.84531 0 7.5V19.5C0 21.1547 1.34531 22.5 3 22.5H21C22.6547 22.5 24 21.1547 24 19.5V7.5C24 5.84531 22.6547 4.5 21 4.5H17.4984L17.0109 3.0375C16.7062 2.11875 15.8484 1.5 14.8781 1.5H9.12188C8.15156 1.5 7.29375 2.11875 6.98906 3.0375ZM12 9C13.1935 9 14.3381 9.47411 15.182 10.318C16.0259 11.1619 16.5 12.3065 16.5 13.5C16.5 14.6935 16.0259 15.8381 15.182 16.682C14.3381 17.5259 13.1935 18 12 18C10.8065 18 9.66193 17.5259 8.81802 16.682C7.97411 15.8381 7.5 14.6935 7.5 13.5C7.5 12.3065 7.97411 11.1619 8.81802 10.318C9.66193 9.47411 10.8065 9 12 9Z"
                  fill="#008000"
                />
              </svg>
            }
            title="Photo Verification"
            description="Prevent time fraud with mandatory photo capture during clock-in."
          />
          <FeatureCard
            icon={
              <svg
                width="19"
                height="24"
                viewBox="0 0 19 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.7672 23.4C13.1719 20.3906 18.6562 13.0969 18.6562 9C18.6562 4.03125 14.625 0 9.65625 0C4.6875 0 0.65625 4.03125 0.65625 9C0.65625 13.0969 6.14062 20.3906 8.54531 23.4C9.12187 24.1172 10.1906 24.1172 10.7672 23.4ZM9.65625 6C10.4519 6 11.215 6.31607 11.7776 6.87868C12.3402 7.44129 12.6562 8.20435 12.6562 9C12.6562 9.79565 12.3402 10.5587 11.7776 11.1213C11.215 11.6839 10.4519 12 9.65625 12C8.8606 12 8.09754 11.6839 7.53493 11.1213C6.97232 10.5587 6.65625 9.79565 6.65625 9C6.65625 8.20435 6.97232 7.44129 7.53493 6.87868C8.09754 6.31607 8.8606 6 9.65625 6Z"
                  fill="#4BA0F4"
                />
              </svg>
            }
            title="Location Tracking"
            description="Ensure employees clock in from designated work locations."
          />
          <FeatureCard
            icon={
              <svg
                width="25"
                height="24"
                viewBox="0 0 25 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.32812 3C3.32812 2.17031 2.65781 1.5 1.82812 1.5C0.998437 1.5 0.328125 2.17031 0.328125 3V18.75C0.328125 20.8219 2.00625 22.5 4.07812 22.5H22.8281C23.6578 22.5 24.3281 21.8297 24.3281 21C24.3281 20.1703 23.6578 19.5 22.8281 19.5H4.07812C3.66563 19.5 3.32812 19.1625 3.32812 18.75V3ZM22.3875 7.05938C22.9734 6.47344 22.9734 5.52188 22.3875 4.93594C21.8016 4.35 20.85 4.35 20.2641 4.93594L15.3281 9.87656L12.6375 7.18594C12.0516 6.6 11.1 6.6 10.5141 7.18594L5.26406 12.4359C4.67813 13.0219 4.67813 13.9734 5.26406 14.5594C5.85 15.1453 6.80156 15.1453 7.3875 14.5594L11.5781 10.3734L14.2687 13.0641C14.8547 13.65 15.8063 13.65 16.3922 13.0641L22.3922 7.06406L22.3875 7.05938Z"
                  fill="#008000"
                />
              </svg>
            }
            title="Reports & Analytics"
            description="Comprehensive reporting tools for effective workforce management."
          />
        </div>
      </section>
    );
  }
);

Features.displayName = "Features";
