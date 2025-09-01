import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center gap-3 w-fit max-sm:gap-1 ">
      <img
        src="/assets/logo.svg"
        alt="anypage-logo"
        width={30}
        className="max-sm:w-[20px]"
      />
      <h1 className="text-2xl max-sm:text-lg font-bold text-primary font-highlight">
        anypage
      </h1>
    </div>
  );
};

export default Logo;
