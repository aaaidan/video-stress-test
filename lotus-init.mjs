function readyPromise(scene) {
  return new Promise((res) => {
    let timer = setInterval(() => {
      if (scene.ready) {
        clearInterval(timer);
        res(scene);
      }
    }, 10);
  });
}

export async function initLotus() {
  const lotus = window.Lotus.instance();

  lotus.settings.initialize({
    FeatureDetect: {
      touchAvailable: () => false,
    },
    UserAgent: {
      browser: {
        safari: true,
        version: {
          major: 18,
          minor: 0,
        },
      },
    },
  });

  await lotus.initialize();

  let scene = await lotus.createScene({
    element: document.querySelector(".canvas"),
    url: "assets/scenes/iPhoneViewer_L_ROW_avif.lsd",
  });

  await readyPromise(scene);
  console.log("scene.ready", scene.ready);
}
