"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { InteractiveHoverButton } from "@/components/ui/buttons";

interface HeroProps {
  showButton?: boolean;
}

function Hero({ showButton = true }: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const router = useRouter();
  const titles = useMemo(
    () => [
      "Save the books you've read", 
      "Like the book", 
      "Follow your friends",
      "Get book recommendations", 
      "Share your lists",
      "Show off your taste", 
      "Share your collection"],
    [],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          {/* <div className="flex justify-center">
            <InteractiveHoverButton
              text="Read our launch article"
              className="w-56 text-sm translate-x-10"
              showIdleAccent={false}
            />
          </div> */}
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              <span className="text-9xl text-spektr-cyan-50" style={{ fontFamily: '"brooklyn-heritage-script", serif' }}>PaperBoxd</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute text-4xl top-9 font-semibold md:text-5xl"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p 
              className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center"
              style={{ fontFamily: '"joc", sans-serif' }}
            >
              Create lists, share books, add favourites, and much more on PaperBoxd.
            </p>
          </div>
          {showButton && (
            <div className="flex flex-row flex-wrap justify-center gap-3">
              <InteractiveHoverButton
                text="Start saving your books"
                showIdleAccent={false}
                invert
                className="w-64 sm:w-72"
                onClick={() => router.push("/auth")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { Hero };

