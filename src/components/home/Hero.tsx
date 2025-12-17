import React from "react";
import { CustomButton } from "@/components/ui/custom-button";
import { useNavigate } from "react-router-dom";

export const Hero = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    const navigate = useNavigate();

    return (
      <section ref={ref} className="bg-white mt-[65px] px-20 py-24 max-sm:p-4" {...props}>
        <div className="max-w-screen-xl flex justify-between items-center mx-auto my-0 max-md:px-10 max-md:py-0 max-sm:flex-col max-sm:gap-12 max-sm:text-center">
          <div className="max-w-[570px] max-sm:mb-8">
            <h1 className="text-5xl font-bold leading-[48px] text-gray-900 mb-8 max-sm:text-4xl max-sm:leading-10">
              Track Time, Not Paperwork
            </h1>
            <p className="text-xl leading-5 text-gray-600 mb-14 max-sm:text-lg">
              Secure time tracking with photo verification and location tracking
              for modern businesses.
            </p>
            <div className="flex gap-4 max-sm:flex-col max-sm:gap-4">
              <CustomButton
                variant="primary"
                onClick={() => navigate("/signup")}
              >
                Start Free Trial
              </CustomButton>
              <CustomButton
                variant="secondary"
                onClick={() => navigate("/features")}
              >
                Features
              </CustomButton>
            </div>
          </div>
          <div className="w-[640px] h-[640px] flex justify-center items-center shadow-[0_25px_50px_rgba(0,0,0,0.25)] rounded-lg max-md:w-[480px] max-md:h-[480px] max-sm:w-full max-sm:h-auto max-sm:p-8">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/TEMP/9cb2c4316ac36c24106b4a3ab8fa77b6da84bf4e"
              alt="Mobile app interface"
              className="w-[272px] h-[552px] max-md:w-[220px] max-md:h-[447px] max-sm:w-40 max-sm:h-[325px]"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    );
  }
);

Hero.displayName = "Hero";
