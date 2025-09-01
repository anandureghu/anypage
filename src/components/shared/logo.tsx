import React from "react";

const Logo = () => {
  return (
    <div className="flex items-center gap-3 w-fit ">
      <img src="/assets/logo.svg" alt="anypage-logo" width={30} />
      <h1 className="text-2xl font-bold text-primary font-highlight">
        anypage
      </h1>
    </div>
  );
};

export default Logo;
