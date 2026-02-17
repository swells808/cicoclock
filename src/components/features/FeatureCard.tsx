import React from "react";
import { LucideIcon, ArrowRight } from "lucide-react";

interface FeatureCardProps {
  headline: string;
  description: string;
  imageSrc: string;
  icon: LucideIcon;
  imageOnRight?: boolean;
  extraContent?: React.ReactNode;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  headline,
  description,
  imageSrc,
  icon: Icon,
  imageOnRight = false,
  extraContent,
}) => {
  return (
    <div className="bg-card rounded-3xl p-8 lg:p-12 shadow-soft border border-border hover:shadow-xl transition-shadow duration-300">
      <div className={`flex flex-col ${imageOnRight ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-16`}>
        {/* Image Side */}
        <div className="w-full lg:w-1/2">
          <div className="relative rounded-2xl overflow-hidden shadow-lg group">
            <div className="absolute inset-0 bg-foreground/5 group-hover:bg-foreground/0 transition-colors duration-300" />
            <img
              src={imageSrc}
              alt={headline}
              className="w-full h-64 sm:h-80 lg:h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
          </div>
          {extraContent && <div className="mt-6">{extraContent}</div>}
        </div>

        {/* Text Side */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="inline-flex items-center justify-center p-3 bg-cico-green/10 rounded-xl">
            <Icon className="h-8 w-8 text-cico-green" />
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            {headline}
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed">
            {description}
          </p>

          <div className="pt-2">
            <button className="text-cico-green font-semibold hover:text-cico-green/80 flex items-center gap-2 group">
              Learn more
              <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
