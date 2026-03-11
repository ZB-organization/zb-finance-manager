import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const SuccessComponent = () => {
  return (
    <div
      style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}
    >
      <DotLottieReact
        src="https://res.cloudinary.com/dolsmkyl0/raw/upload/v1773254434/Success_do5bo2.lottie"
        autoplay
        loop={true}
        style={{ height: "60px", width: "60px" }}
      />
    </div>
  );
};

export default SuccessComponent;
