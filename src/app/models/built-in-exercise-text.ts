import { BuiltInExercise, ExerciseText } from './exercise';

/**
 * Each built-in exercise's description, how-to steps and tips, by id: the words for
 * BUILT_IN_EXERCISES, in the same order. Kept apart so they aren't in the first download:
 * the exercise store loads them when an exercise's details are shown.
 */
export const BUILT_IN_EXERCISE_TEXT: Readonly<Record<BuiltInExercise['id'], ExerciseText>> = {
    'builtin:back-squat': {
        description:
            'The bar sits across your upper back, and you sit down and stand up with it. Few exercises build the legs and glutes as much.',
        steps: [
            'Set the bar in a rack at shoulder height. Step under it so it rests across your upper back.',
            'Stand up to lift it off, take two steps back, feet shoulder-width apart, toes turned out a little.',
            'Breathe in, then sit your hips back and down, chest up, until your thighs are at least level with the floor.',
            'Push through your whole foot to stand back up, breathing out.',
        ],
        tips: [
            "Knees follow your toes; don't let them cave in.",
            "Set the rack's safety bars just below the bottom of your squat.",
        ],
    },
    'builtin:deadlift': {
        description:
            'Lifting a loaded bar from the floor until you stand tall. It works almost everything from your grip to your calves.',
        steps: [
            'Stand with the bar over the middle of your feet, feet hip-width apart.',
            'Bend down and grip the bar just outside your legs. Shins to the bar, back flat, chest up.',
            'Take a big breath and brace, then push the floor away until you stand tall, the bar close to your legs.',
            'Lower it the same way: hips back first, then bend your knees once it passes them.',
        ],
        tips: [
            'Keep the bar touching your legs all the way up and down.',
            "Don't lean back at the top; just stand up straight.",
        ],
    },
    'builtin:bench-press': {
        description:
            'Lying on a bench, you lower a bar to your chest and press it back up. The main lift for chest strength.',
        steps: [
            'Lie on the bench with your eyes under the bar and your feet flat on the floor.',
            'Grip the bar a little wider than your shoulders, squeeze your shoulder blades together, and lift it off.',
            'Lower it slowly to the middle of your chest, elbows angled in a little from your sides.',
            'Press it back up until your arms are straight.',
        ],
        tips: [
            'Use a spotter, or safety bars, when you go heavy.',
            'Keep your bottom on the bench and your feet on the floor.',
        ],
    },
    'builtin:overhead-press': {
        description:
            'Standing, you press a bar from your shoulders to straight overhead. Builds strong shoulders and a steady middle.',
        steps: [
            'Take the bar from a rack at chest height, hands just wider than your shoulders, so it rests on the front of your shoulders.',
            'Stand tall with your feet hip-width apart. Squeeze your glutes and brace your middle.',
            'Press the bar straight up, moving your head back out of the way, then forward again once the bar passes it.',
            'Finish with your arms straight and the bar over the middle of your feet, then lower it to your shoulders.',
        ],
        tips: ["Don't lean back to get it up; if you have to, it's too heavy."],
    },
    'builtin:barbell-row': {
        description:
            "Leaning forward, you pull a bar up to your stomach. It builds the back that you don't see in the mirror.",
        steps: [
            'Hold the bar with your hands just wider than your knees, and stand up with it.',
            'Push your hips back and lean forward until your back is nearly flat, knees slightly bent.',
            'Pull the bar up to your stomach, elbows back, squeezing your shoulder blades together.',
            'Lower it until your arms are straight, without letting your back round.',
        ],
        tips: ['Keep your back still: only your arms move.'],
    },
    'builtin:pull-up': {
        description:
            'Hanging from a bar with your palms facing away, you pull yourself up until your chin is over it.',
        steps: [
            'Grip the bar a little wider than your shoulders, palms facing away, and hang with your arms straight.',
            'Pull your shoulders down, then pull yourself up until your chin is over the bar.',
            'Lower yourself all the way, under control, until your arms are straight again.',
        ],
        tips: [
            "Can't do one yet? Loop a band over the bar to stand in, or just lower yourself slowly from the top.",
        ],
    },
    'builtin:push-up': {
        description:
            'From a plank on your hands, you lower your chest to the floor and push back up. A bench press you can do anywhere.',
        steps: [
            'Put your hands on the floor just wider than your shoulders, and step your feet back into a straight line.',
            'Lower yourself until your chest is just above the floor, elbows angled back a little.',
            'Push back up until your arms are straight, keeping your body in one straight line.',
        ],
        tips: ['Too hard? Put your hands on a bench or step to make it easier.'],
    },
    'builtin:romanian-deadlift': {
        description:
            'From standing, you lower a bar down your legs by pushing your hips back, then stand back up. Great for hamstrings.',
        steps: [
            'Stand tall holding the bar in front of your thighs, hands just outside your legs.',
            'With your knees slightly bent, push your hips back and let the bar slide down your legs.',
            'Go down until you feel a strong stretch in your hamstrings, usually just below your knees.',
            'Push your hips forward to stand back up.',
        ],
        tips: ["It's a hip movement, not a squat: your knees barely bend more as you go down."],
    },
    'builtin:dumbbell-lunge': {
        description:
            'With a dumbbell in each hand, you step forward and drop your back knee towards the floor. One leg at a time.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides.',
            'Take a long step forward and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to step back to standing.',
            'Swap legs each time, or do all your reps on one leg, then the other.',
        ],
        tips: ['Count each leg as a rep, or each pair, but always count the same way.'],
    },
    'builtin:plank': {
        description:
            'You hold your body in a straight line on your forearms and toes. Builds a middle that holds steady.',
        steps: [
            'Put your forearms on the floor, elbows under your shoulders.',
            'Step your feet back so your body makes a straight line from head to heels.',
            'Squeeze your glutes, brace your middle, and hold, breathing steadily.',
        ],
        tips: ["Stop when your hips start to sag; that's the end of the set."],
    },
    // Second batch: squat and press variations, the cable and machine basics, arms, hips
    'builtin:front-squat': {
        description:
            'A squat with the bar resting on the front of your shoulders. It keeps you more upright and hits the quads harder.',
        steps: [
            'Set the bar in a rack at shoulder height. Step in so it rests on the front of your shoulders, close to your throat.',
            'Hold it with your fingertips just outside your shoulders, elbows pointing forward and high.',
            'Step back, feet shoulder-width apart, and sit straight down between your heels, keeping your elbows up.',
            'Push through your whole foot to stand back up.',
        ],
        tips: [
            "Wrists won't bend that far? Cross your arms over the bar instead.",
            'If your elbows drop, the bar rolls forward: lead with them on the way up.',
        ],
    },
    'builtin:goblet-squat': {
        description:
            'A squat holding one dumbbell or kettlebell against your chest. The easiest way to learn a good squat.',
        steps: [
            'Hold one end of a dumbbell, or a kettlebell by its horns, against your chest, elbows pointing down.',
            'Stand with your feet a little wider than your shoulders, toes turned out a little.',
            'Sit down between your heels until your elbows touch the inside of your knees.',
            'Push through your whole foot to stand back up.',
        ],
        tips: ['Keep the weight touching your chest the whole time.'],
    },
    'builtin:incline-dumbbell-press': {
        description:
            'Lying on a bench set at an angle, you press two dumbbells up from your chest. Works the upper chest.',
        steps: [
            'Set the bench to a low angle, about 30 degrees, and sit with a dumbbell on each thigh.',
            'Lie back, bringing the dumbbells up beside your chest, palms facing your feet.',
            'Press them up until your arms are straight, bringing them together over your chest.',
            'Lower them slowly back to the sides of your chest.',
        ],
        tips: ["The higher the bench, the more it's a shoulder press: keep it low."],
    },
    'builtin:dumbbell-shoulder-press': {
        description:
            'Sitting on an upright bench, you press two dumbbells from your shoulders to overhead.',
        steps: [
            'Set the bench upright and sit with your back against it, a dumbbell on each thigh.',
            'Bring them up to your shoulders, palms facing forward, elbows under your hands.',
            'Press them up until your arms are straight, the dumbbells nearly touching overhead.',
            'Lower them slowly back to your shoulders.',
        ],
        tips: ['Keep your back against the bench; arching it shifts the work off your shoulders.'],
    },
    'builtin:lat-pulldown': {
        description:
            'Sitting at a machine, you pull a wide bar down to your chest. A pull-up you can set the weight for.',
        steps: [
            'Set the knee pad so your thighs are held down, and grip the bar a little wider than your shoulders.',
            'Sit down with your arms straight, leaning back just a little.',
            'Pull the bar down to the top of your chest, driving your elbows down and back.',
            'Let it back up slowly until your arms are straight.',
        ],
        tips: ["Don't swing back to move the weight; if you have to, lower it."],
    },
    'builtin:seated-cable-row': {
        description:
            'Sitting with your feet braced, you pull a cable handle to your stomach. Builds the middle of your back.',
        steps: [
            'Sit with your feet on the platform, knees slightly bent, and hold the handle with your arms straight.',
            'Sit up tall, chest up, without leaning back.',
            'Pull the handle to your stomach, squeezing your shoulder blades together.',
            'Let it forward slowly until your arms are straight again.',
        ],
        tips: ['Keep your body still and let only your arms and shoulder blades move.'],
    },
    'builtin:dumbbell-curl': {
        description:
            'Standing with a dumbbell in each hand, you bend your elbows to lift them to your shoulders.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides, palms facing forward.',
            'Keeping your elbows by your sides, bend them to lift the dumbbells towards your shoulders.',
            'Lower them slowly until your arms are straight.',
        ],
        tips: ["If you're swinging your body to lift them, they're too heavy."],
    },
    'builtin:triceps-pushdown': {
        description:
            'Standing at a cable, you push a bar or rope down until your arms are straight. Works the backs of your arms.',
        steps: [
            'Set the cable high and hold the bar or rope with your elbows bent and tucked into your sides.',
            'Push it down until your arms are straight, keeping your elbows where they are.',
            'Let it back up slowly until your forearms are just above level.',
        ],
        tips: ['Your elbows stay pinned to your sides; only your forearms move.'],
    },
    'builtin:hip-thrust': {
        description:
            'With your upper back on a bench and a bar across your hips, you lift your hips until your body is flat.',
        steps: [
            'Sit on the floor with your upper back against the side of a bench, and roll the bar over your hips.',
            'Plant your feet hip-width apart, close enough that your shins are upright at the top.',
            'Push through your heels to lift your hips until your body is flat from shoulders to knees.',
            'Squeeze your glutes at the top, then lower your hips back down.',
        ],
        tips: ['A pad or folded towel under the bar makes it far more comfortable.'],
    },
    'builtin:kettlebell-swing': {
        description:
            'You swing a kettlebell from between your legs to chest height by snapping your hips forward.',
        steps: [
            'Stand with your feet a little wider than your shoulders, the kettlebell on the floor in front of you.',
            'Push your hips back, grip it with both hands, and hike it back between your legs.',
            'Snap your hips forward to stand tall, letting the kettlebell float up to chest height.',
            'Let it fall back between your legs, pushing your hips back, and go straight into the next one.',
        ],
        tips: ["Your hips do the work, not your arms: they're only there to hold on."],
    },
    // Third batch: leg machines, calves, more pulling, dips, shoulders and a hanging core move
    'builtin:leg-press': {
        description:
            'Sitting in a machine, you push a loaded platform away with your feet. Heavy leg work without a bar on your back.',
        steps: [
            'Sit with your back flat against the pad and your feet hip-width apart in the middle of the platform.',
            'Push the platform up and release the safety handles.',
            'Lower it by bending your knees towards your chest, until they are at about a right angle.',
            'Push it back up without locking your knees out at the top.',
        ],
        tips: [
            "Don't let your lower back lift off the pad at the bottom; stop a little higher if it does.",
        ],
    },
    'builtin:leg-curl': {
        description:
            'At a machine, you bend your knees against a padded bar. The simplest way to work your hamstrings alone.',
        steps: [
            'Set the machine so your knees line up with its pivot and the pad sits just above your heels.',
            'Bend your knees to curl the pad as far as it will go.',
            'Squeeze for a moment, then let it back slowly until your legs are nearly straight.',
        ],
        tips: ['Keep your hips down on the pad; lifting them takes the work off your hamstrings.'],
    },
    'builtin:leg-extension': {
        description:
            'Sitting at a machine, you straighten your legs against a padded bar. Works the quads on their own.',
        steps: [
            'Set the machine so your knees line up with its pivot and the pad sits on the front of your ankles.',
            'Hold the handles and straighten your legs until they are nearly locked out.',
            'Lower the pad slowly until your knees are back at a right angle.',
        ],
        tips: ['Go slowly on the way down; that half of the rep counts as much as the lift.'],
    },
    'builtin:calf-raise': {
        description:
            'Standing on the edge of a step, you rise up onto your toes and lower your heels below the step.',
        steps: [
            'Stand with the balls of your feet on the edge of a step, holding something for balance.',
            'Lower your heels below the step until you feel a stretch in your calves.',
            'Rise up onto your toes as high as you can, and hold for a moment at the top.',
        ],
        tips: ['Too easy? Hold a dumbbell in your free hand, or do one leg at a time.'],
    },
    'builtin:dumbbell-row': {
        description:
            'With one hand and knee on a bench, you pull a dumbbell up to your hip with the other arm.',
        steps: [
            'Put your left knee and left hand on a bench, back flat, and hold a dumbbell in your right hand.',
            'Let it hang with your arm straight, below your shoulder.',
            'Pull it up towards your hip, elbow close to your side, until your elbow passes your back.',
            'Lower it slowly, then do all your reps before swapping sides.',
        ],
        tips: ['Pull towards your hip, not your shoulder: think of starting a lawnmower.'],
    },
    'builtin:chin-up': {
        description:
            'Like a pull-up, but with your palms facing you. Usually a little easier, and harder on your biceps.',
        steps: [
            'Grip the bar shoulder-width apart, palms facing you, and hang with your arms straight.',
            'Pull your shoulders down, then pull yourself up until your chin is over the bar.',
            'Lower yourself all the way, under control, until your arms are straight again.',
        ],
        tips: ["Don't kick or swing to get up; slow reps you can control count for more."],
    },
    'builtin:dip': {
        description:
            'Holding yourself up on two bars, you lower your body by bending your elbows and press back up.',
        steps: [
            'Grip the bars and jump or step up so your arms are straight and your body hangs between them.',
            'Lean forward slightly and bend your elbows to lower yourself until your upper arms are level with the bars.',
            'Press back up until your arms are straight.',
        ],
        tips: [
            'Stop lower if your shoulders ache at the bottom.',
            'Too hard? Use the assisted dip machine, or a band looped over the bars.',
        ],
    },
    'builtin:lateral-raise': {
        description:
            'Standing with light dumbbells, you raise your arms out to the sides. Builds broader shoulders.',
        steps: [
            'Stand tall with a dumbbell in each hand by your sides, elbows slightly bent.',
            'Raise your arms out to the sides until your hands are level with your shoulders.',
            'Lower them slowly back to your sides.',
        ],
        tips: [
            'Go lighter than you think; swinging heavy ones up works your traps, not your shoulders.',
        ],
    },
    'builtin:face-pull': {
        description:
            'At a high cable, you pull a rope towards your face, hands apart. Good for the backs of your shoulders.',
        steps: [
            'Set the cable at head height with a rope, and hold an end in each hand, thumbs towards you.',
            'Step back until your arms are straight, and stand tall.',
            'Pull the rope towards your face, pulling the ends apart so your hands finish beside your ears.',
            'Let it forward slowly until your arms are straight.',
        ],
        tips: ['Keep it light and slow: this is about control, not weight.'],
    },
    'builtin:hanging-leg-raise': {
        description:
            'Hanging from a bar, you lift your legs up in front of you. One of the hardest moves for your abs.',
        steps: [
            'Hang from a bar with your hands shoulder-width apart and your legs straight.',
            'Lift your legs up in front of you until they are level with the floor, or higher.',
            'Lower them slowly, without swinging, until they hang straight again.',
        ],
        tips: ['Too hard? Bend your knees and lift them to your chest instead.'],
    },
    // Fourth batch: core, carries and variations
    'builtin:side-plank': {
        description:
            'You hold your body in a straight line on one forearm and the side of one foot. Works the sides of your middle.',
        steps: [
            'Lie on your side with your forearm on the floor, elbow under your shoulder, legs straight and stacked.',
            'Lift your hips until your body makes a straight line from head to feet.',
            'Brace your middle and hold, breathing steadily, then lower your hips and swap sides.',
        ],
        tips: [
            "Don't let your hips sag towards the floor or push back behind you.",
            'Too hard? Bend your knees and rest on the side of your bottom knee instead of your foot.',
        ],
    },
    'builtin:dead-bug': {
        description:
            'Lying on your back, you lower the opposite arm and leg while keeping your back flat. Teaches your middle to hold still.',
        steps: [
            'Lie on your back with your arms pointing at the ceiling and your knees bent at a right angle over your hips.',
            'Press your lower back into the floor and brace your middle.',
            'Slowly lower your right arm behind your head and your left leg towards the floor, without touching it.',
            'Bring them back to the start, then do the same with your left arm and right leg.',
        ],
        tips: [
            'If your lower back lifts off the floor, you have gone too far: stop a little higher.',
        ],
    },
    'builtin:russian-twist': {
        description:
            'Sitting leaning back with your feet up, you turn your body from side to side. Works the sides of your middle.',
        steps: [
            'Sit on the floor with your knees bent, and lean back until your body is at about 45 degrees.',
            'Hold your hands together in front of your chest, and lift your feet a little off the floor.',
            'Turn your shoulders to one side, then the other, keeping your back long.',
        ],
        tips: [
            'Turn your shoulders, not just your arms: your hands follow your chest.',
            'Too easy? Hold a dumbbell or a plate. Too hard? Keep your heels on the floor.',
        ],
    },
    'builtin:farmers-carry': {
        description:
            'You walk holding a heavy weight in each hand, standing tall. Builds a strong grip and a steady middle.',
        steps: [
            'Stand between two heavy dumbbells or kettlebells, and squat down to pick them up, back flat.',
            'Stand tall, shoulders down and back, arms straight by your sides.',
            'Walk with short, steady steps, keeping your body upright, until the time is up.',
            'Stop, and squat down to put them back on the floor.',
        ],
        tips: ["Don't let the weights pull your shoulders forward or tip you to one side."],
    },
    'builtin:sumo-deadlift': {
        description:
            'A deadlift with your feet wide and your hands inside your legs. Keeps you more upright and works your inner thighs.',
        steps: [
            'Stand with your feet wide, toes turned out, and the bar over the middle of your feet.',
            'Bend down and grip the bar inside your legs, hands shoulder-width apart. Shins to the bar, chest up.',
            'Take a big breath and brace, then push your knees out and the floor away until you stand tall.',
            'Lower it the same way, keeping the bar close to your legs.',
        ],
        tips: [
            'Push your knees out over your toes the whole way up.',
            "Don't let your hips shoot up first; your chest and hips rise together.",
        ],
    },
    'builtin:bulgarian-split-squat': {
        description:
            'With your back foot up on a bench, you lower your back knee towards the floor. Hard work for one leg at a time.',
        steps: [
            'Stand about a stride in front of a bench with a dumbbell in each hand, and rest the top of one foot on it.',
            'Bend your front knee to lower your back knee towards the floor, keeping your chest up.',
            'Go down until your front thigh is about level with the floor.',
            'Push through your front foot to stand back up. Do all your reps, then swap legs.',
        ],
        tips: [
            'Wobbly? Move your front foot a little further out to the side.',
            'Learn it with no weight first; it is harder than it looks.',
        ],
    },
    'builtin:step-up': {
        description:
            'You step up onto a box or bench with one foot and stand tall on it. Works your legs one at a time.',
        steps: [
            'Stand facing a box or bench about knee height, and put one whole foot on top of it.',
            'Push through that foot to stand up on the box, bringing your other foot up beside it.',
            'Step back down with the same foot you brought up last, under control.',
            'Do all your reps on one leg, then swap.',
        ],
        tips: [
            "Push with the leg on the box, not the one on the floor; don't bounce off it.",
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    'builtin:hammer-curl': {
        description:
            'A dumbbell curl with your palms facing each other, like holding a hammer. Works your forearms as well as biceps.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides, palms facing your legs.',
            'Keeping your elbows by your sides, bend them to lift the dumbbells towards your shoulders.',
            'Lower them slowly until your arms are straight, palms still facing in.',
        ],
        tips: ["Keep your thumbs pointing up the whole time; don't let your wrists turn."],
    },
    'builtin:skull-crusher': {
        description:
            'Lying on a bench, you lower a bar or dumbbells towards your forehead by bending your elbows, then straighten them.',
        steps: [
            'Lie on a bench holding a bar, or a dumbbell in each hand, straight up over your chest.',
            'Keeping your upper arms still, bend your elbows to lower the weight towards your forehead.',
            'Stop just above your head, then straighten your arms to press it back up.',
        ],
        tips: [
            'Keep your elbows pointing at the ceiling; letting them flare out takes the work off your triceps.',
            'A bent EZ bar is kinder on your wrists than a straight one.',
        ],
    },
    'builtin:glute-bridge': {
        description:
            'Lying on your back with your knees bent, you lift your hips off the floor. A hip thrust you can do anywhere.',
        steps: [
            'Lie on your back with your knees bent, feet flat on the floor hip-width apart, arms by your sides.',
            'Push through your heels to lift your hips until your body is straight from shoulders to knees.',
            'Squeeze your glutes at the top for a moment, then lower your hips back to the floor.',
        ],
        tips: [
            "Don't arch your lower back to get higher; stop when your hips are in line.",
            'Too easy? Do one leg at a time, or rest a weight across your hips.',
        ],
    },
    // Fifth batch: chest, shoulders and arms
    'builtin:dumbbell-bench-press': {
        description:
            'Lying on a flat bench, you press two dumbbells up from your chest. Each arm has to do its own share.',
        steps: [
            'Sit on the end of a flat bench with a dumbbell on each thigh.',
            'Lie back, bringing the dumbbells up beside your chest, palms facing your feet, feet flat on the floor.',
            'Press them up until your arms are straight, bringing them together over your chest.',
            'Lower them slowly back to the sides of your chest, elbows angled in a little from your sides.',
        ],
        tips: [
            'Done? Bring the dumbbells to your chest and sit up with them, rather than dropping them out to the sides.',
        ],
    },
    'builtin:incline-bench-press': {
        description:
            'A bench press on a bench set at an angle. Works the upper chest, with more help from your shoulders.',
        steps: [
            'Set the bench to about 30 degrees and lie back with your eyes just under the bar.',
            'Grip the bar a little wider than your shoulders, squeeze your shoulder blades together, and lift it off.',
            'Lower it slowly to the top of your chest, just under your collarbones.',
            'Press it back up until your arms are straight, over your shoulders.',
        ],
        tips: [
            'Use a spotter, or safety bars, when you go heavy.',
            'Keep your bottom on the bench; lifting it turns this back into a flat press.',
        ],
    },
    'builtin:close-grip-bench-press': {
        description:
            'A bench press with your hands about shoulder-width apart. Puts more of the work on the backs of your arms.',
        steps: [
            'Lie on the bench with your eyes under the bar and your feet flat on the floor.',
            'Grip the bar with your hands about shoulder-width apart, and lift it off.',
            'Lower it slowly to the bottom of your chest, keeping your elbows close to your sides.',
            'Press it back up until your arms are straight.',
        ],
        tips: [
            "Don't go narrower than your shoulders: it's harder on your wrists without working your triceps more.",
        ],
    },
    'builtin:dumbbell-fly': {
        description:
            'Lying on a bench, you open your arms wide with a dumbbell in each hand, then bring them back together.',
        steps: [
            'Lie on a flat bench holding a dumbbell in each hand straight up over your chest, palms facing each other.',
            'With a slight bend in your elbows, lower your arms out to the sides in a wide arc.',
            'Stop when you feel a stretch across your chest, with your hands about level with the bench.',
            'Bring them back up over your chest the same way, as if hugging a tree.',
        ],
        tips: [
            'Keep the bend in your elbows the same all the way; bending more turns it into a press.',
            'Go lighter than for a press, and stop short of where your shoulders feel strained.',
        ],
    },
    'builtin:cable-crossover': {
        description:
            'Standing between two high cables, you pull the handles down and together in front of you. Keeps your chest working throughout.',
        steps: [
            'Set both cables high, take a handle in each hand, and step forward to stand between them.',
            'Stand with one foot in front of the other, leaning forward a little, arms out to the sides, elbows slightly bent.',
            'Pull the handles down and together in a wide arc until they meet in front of your hips.',
            'Let them back out slowly until you feel a stretch across your chest.',
        ],
        tips: ['Set the cables low and pull up and together to work the upper chest instead.'],
    },
    'builtin:arnold-press': {
        description:
            'A seated dumbbell shoulder press that starts with your palms facing you and turns them out as you press.',
        steps: [
            'Set the bench upright and sit with your back against it, a dumbbell in each hand.',
            'Hold them in front of your shoulders, palms facing you, elbows bent and in front of your body.',
            'Press them up, turning your palms to face forward as they rise, until your arms are straight overhead.',
            'Lower them the same way, turning your palms back towards you as they reach your shoulders.',
        ],
        tips: ['Go lighter than for a plain shoulder press, and keep the turn smooth and slow.'],
    },
    'builtin:rear-delt-fly': {
        description:
            'Leaning forward with light dumbbells, you raise your arms out to the sides. Works the backs of your shoulders.',
        steps: [
            'Stand with a dumbbell in each hand, then push your hips back and lean forward until your back is nearly flat.',
            'Let the dumbbells hang below your shoulders, palms facing each other, elbows slightly bent.',
            'Raise your arms out to the sides until your hands are level with your shoulders.',
            'Lower them slowly until they hang below your shoulders again.',
        ],
        tips: [
            "Use light ones and lead with your elbows; if you're swinging your body, they're too heavy.",
            'Back tired? Do it sitting on the end of a bench, leaning forward over your knees.',
        ],
    },
    'builtin:shrug': {
        description:
            'Standing with a heavy weight in your hands, you lift your shoulders up towards your ears. Builds the traps.',
        steps: [
            'Stand tall holding a dumbbell in each hand by your sides, or a bar in front of your thighs.',
            'Keeping your arms straight, lift your shoulders straight up towards your ears as high as you can.',
            'Hold for a moment at the top, then lower them slowly all the way down.',
        ],
        tips: ["Lift straight up; there's no need to roll your shoulders round."],
    },
    'builtin:preacher-curl': {
        description:
            'A curl with the backs of your arms resting on an angled pad. Stops you swinging, so your biceps do all the work.',
        steps: [
            'Sit at a preacher bench with the backs of your upper arms flat on the pad, armpits at its top edge.',
            'Hold a bar, or a dumbbell in each hand, palms facing up, arms nearly straight.',
            'Bend your elbows to curl the weight up towards your shoulders, keeping your arms on the pad.',
            'Lower it slowly until your arms are nearly straight again.',
        ],
        tips: [
            "Don't let the weight drop the last part of the way; go slowly where it's hardest.",
            'No preacher bench? Kneel behind an incline bench and rest your arm over its back.',
        ],
    },
    'builtin:overhead-triceps-extension': {
        description:
            'Holding one dumbbell overhead in both hands, you lower it behind your head and straighten your arms again.',
        steps: [
            'Stand or sit tall, holding one end of a dumbbell in both hands straight up over your head.',
            'Keeping your upper arms still and close to your head, bend your elbows to lower it behind your head.',
            'Go down until you feel a stretch in the backs of your arms.',
            'Straighten your arms to lift it back overhead.',
        ],
        tips: [
            'Keep your elbows pointing forward, not out to the sides.',
            'Arching your back? Brace your middle, or sit on a bench with a backrest.',
        ],
    },
    // Sixth batch: legs
    'builtin:hack-squat': {
        description:
            'A squat in a machine, with your back against a sloped pad and the weight on your shoulders. Hits the quads hard.',
        steps: [
            'Stand on the platform with your back flat against the pad and your shoulders under the shoulder pads.',
            'Put your feet shoulder-width apart, a little forward of your hips, then stand up and release the safety handles.',
            'Bend your knees to lower yourself until your thighs are at least level with the platform.',
            'Push through your whole foot to stand back up, without locking your knees out at the top.',
        ],
        tips: [
            'Feet lower on the platform work your quads more; higher brings in your glutes and hamstrings.',
        ],
    },
    'builtin:walking-lunge': {
        description:
            'You lunge forward one leg after the other, moving across the floor. Works your legs and tests your balance.',
        steps: [
            'Stand tall with your feet together and plenty of clear floor in front of you.',
            'Take a long step forward and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to stand up, bringing your back foot forward into the next step.',
            'Keep going, one leg after the other, until you have done your reps.',
        ],
        tips: [
            'Count each leg as a rep, or each pair, but always count the same way.',
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    'builtin:reverse-lunge': {
        description:
            'You step backwards and drop your back knee towards the floor. Kinder on your knees than stepping forward.',
        steps: [
            'Stand tall with your feet hip-width apart.',
            'Take a long step back with one foot and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to bring your back foot forward and stand up again.',
            'Swap legs each time, or do all your reps on one leg, then the other.',
        ],
        tips: [
            'Keep most of your weight on your front foot; the back one is only there for balance.',
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    'builtin:single-leg-romanian-deadlift': {
        description:
            'Standing on one leg, you tip forward with a weight in your hand, your other leg reaching back. Works hamstrings and balance.',
        steps: [
            'Stand on your left leg, knee slightly bent, holding a dumbbell or kettlebell in your right hand.',
            'Push your hips back and tip forward, letting your right leg rise behind you in line with your body.',
            'Lower the weight towards the floor until you feel a strong stretch in your left hamstring.',
            'Squeeze your glutes to stand back up. Do all your reps, then swap sides.',
        ],
        tips: [
            'Keep your hips level, as if both were headlights pointing at the floor.',
            'Wobbly? Rest a fingertip on a wall, or start with no weight.',
        ],
    },
    'builtin:good-morning': {
        description:
            'With a bar across your upper back, you bow forward from your hips and stand back up. Works the whole back of your legs.',
        steps: [
            'Take the bar from a rack so it rests across your upper back, as for a back squat, and step back.',
            'Stand with your feet hip-width apart, knees slightly bent, and brace your middle.',
            'Push your hips back and lean forward, back flat, until your body is nearly level with the floor.',
            'Push your hips forward to stand back up.',
        ],
        tips: ['Start much lighter than you squat; only go as low as you can with a flat back.'],
    },
    'builtin:back-extension': {
        description:
            'With your hips on a pad and your heels held, you lower your body forward and lift it back up. Builds a strong lower back.',
        steps: [
            'Set the pad so its top edge sits just below your hips, and hook your heels under the foot pads.',
            'Cross your arms over your chest, with your body in a straight line.',
            'Bend at your hips to lower your body towards the floor, keeping your back flat.',
            'Lift yourself back up until your body is straight again, without leaning back past it.',
        ],
        tips: ['Too easy? Hold a plate against your chest.'],
    },
    'builtin:nordic-curl': {
        description:
            'Kneeling with your heels held down, you lower your body slowly towards the floor. One of the hardest hamstring moves.',
        steps: [
            "Kneel on a pad with your heels held down by a partner, or hooked under something that won't move.",
            'Keep your body straight from knees to head, arms in front of your chest.',
            'Lower yourself forward as slowly as you can, holding it with your hamstrings.',
            'Catch yourself on your hands, then push off the floor to get back up.',
        ],
        tips: [
            "It's the lowering that counts: most people can't pull themselves back up at first.",
        ],
    },
    'builtin:seated-calf-raise': {
        description:
            'Sitting at a machine with a pad on your knees, you lift your heels. Works the lower part of your calves.',
        steps: [
            'Sit at the machine with the balls of your feet on the step and the pad resting on your thighs, just above your knees.',
            'Lift your heels to raise the pad, and release the safety lever.',
            'Lower your heels below the step until you feel a stretch in your calves.',
            'Rise up onto your toes as high as you can, and hold for a moment at the top.',
        ],
        tips: ["Don't bounce at the bottom; pause there for a moment before lifting."],
    },
    'builtin:hip-abduction': {
        description:
            'Sitting at a machine, you push your knees out against pads. Works the outsides of your hips.',
        steps: [
            'Sit at the machine with your back against the pad and the pads on the outsides of your knees.',
            'Push your knees out as far as they will go.',
            'Hold for a moment, then let them back in slowly, without letting the weights touch.',
        ],
        tips: ['Lean forward a little to work more of your glutes.'],
    },
    'builtin:hip-adduction': {
        description:
            'Sitting at a machine, you squeeze your knees together against pads. Works your inner thighs.',
        steps: [
            'Sit at the machine with your back against the pad and the pads on the insides of your knees.',
            'Set it so your legs start apart, as wide as is comfortable.',
            'Squeeze your knees together until the pads meet.',
            'Hold for a moment, then let them back out slowly.',
        ],
        tips: [
            "Don't start wider than feels comfortable; the stretch at the start is where it's hardest.",
        ],
    },
    // Seventh batch: back, pulling and bodyweight pushing
    'builtin:inverted-row': {
        description:
            'Lying under a bar set at waist height, you pull your chest up to it. A row using your own weight.',
        steps: [
            'Set a bar in a rack or Smith machine at about waist height (or hang rings there), and lie under it.',
            'Grip a little wider than your shoulders, and lift your hips so your body is straight from heels to head.',
            'Pull your chest up to the bar, squeezing your shoulder blades together.',
            'Lower yourself slowly until your arms are straight.',
        ],
        tips: [
            'Too hard? Set the bar higher, or bend your knees and put your feet flat. Too easy? Set it lower.',
        ],
    },
    'builtin:t-bar-row': {
        description:
            'Leaning forward over a bar fixed at one end, you pull the loaded end up to your chest. Lets you row heavy.',
        steps: [
            'Wedge one end of a bar into a corner or landmine, load the other end, and stand astride it facing the plates.',
            'Push your hips back and lean forward until your back is nearly flat, and grip the bar just behind the plates.',
            'Pull it up to your chest, elbows back, squeezing your shoulder blades together.',
            'Lower it until your arms are straight, without letting your back round.',
        ],
        tips: [
            'A V-shaped cable handle hooked under the bar gives you a grip for both hands.',
            'Keep your back still: only your arms move.',
        ],
    },
    'builtin:straight-arm-pulldown': {
        description:
            'Standing at a high cable, you sweep a bar down to your thighs with straight arms. Works your back without your biceps.',
        steps: [
            'Set the cable high with a straight bar or rope, and hold it with your hands shoulder-width apart.',
            'Step back, lean forward a little from your hips, and hold your arms out straight at about head height.',
            'Keeping your arms straight, pull the bar down in an arc until it touches your thighs.',
            'Let it back up slowly until your arms are at head height again.',
        ],
        tips: [
            'Keep a slight bend in your elbows, but never more: bending them turns it into a pushdown.',
        ],
    },
    'builtin:rack-pull': {
        description:
            'A deadlift from a bar resting on the rack, about knee height. Works the top of the lift, usually heavier.',
        steps: [
            "Set the rack's safety bars so the bar rests just below or just above your knees.",
            'Stand close to the bar, feet hip-width apart, and grip it just outside your legs.',
            'Push your hips back, flatten your back, take a big breath and brace.',
            'Push your hips forward to stand tall, then lower the bar back to the safety bars under control.',
        ],
        tips: ["Don't lean back at the top or shrug it up; just stand up straight."],
    },
    'builtin:band-pull-apart': {
        description:
            'Holding a band out in front of you, you pull it apart until it touches your chest. Good for the backs of your shoulders.',
        steps: [
            'Stand tall holding a light band in both hands, arms straight out in front at shoulder height.',
            'Pull your hands apart and out to the sides, squeezing your shoulder blades together.',
            'Stop when the band touches your chest, then let your hands come back together slowly.',
        ],
        tips: [
            'Keep your shoulders down, away from your ears.',
            'Too easy? Hold the band with your hands closer together.',
        ],
    },
    'builtin:cable-curl': {
        description:
            'Standing at a low cable, you bend your elbows to lift a bar to your shoulders. The cable keeps the pull steady.',
        steps: [
            'Set the cable low with a straight or bent bar, and hold it with your palms facing up.',
            'Stand tall, close to the cable, arms straight and elbows by your sides.',
            'Keeping your elbows where they are, bend them to lift the bar towards your shoulders.',
            'Lower it slowly until your arms are straight.',
        ],
        tips: ["If you're leaning back to lift it, it's too heavy."],
    },
    'builtin:bench-dip': {
        description:
            'With your hands on a bench behind you, you lower your body by bending your elbows and press back up.',
        steps: [
            'Sit on the edge of a bench, hands beside your hips, fingers over the edge.',
            'Walk your feet out and slide your bottom off the bench, arms straight.',
            'Bend your elbows to lower yourself until your upper arms are about level with the floor.',
            'Press back up until your arms are straight.',
        ],
        tips: [
            'Keep your back close to the bench, and stop higher if your shoulders ache.',
            'Too easy? Put your feet up on a second bench.',
        ],
    },
    'builtin:diamond-push-up': {
        description:
            'A push-up with your hands close together under your chest. Puts more of the work on the backs of your arms.',
        steps: [
            'Put your hands on the floor under your chest, thumbs and first fingers touching to make a diamond.',
            'Step your feet back so your body makes a straight line from head to heels.',
            'Lower yourself until your chest nearly touches your hands, elbows close to your sides.',
            'Push back up until your arms are straight.',
        ],
        tips: ['Too hard? Do them from your knees, or with your hands on a bench.'],
    },
    'builtin:pike-push-up': {
        description:
            'With your hips high in an upside-down V, you lower your head towards the floor and press back up. A shoulder press with no weights.',
        steps: [
            'Start in a push-up position, then walk your feet in and lift your hips high, so your body makes an upside-down V.',
            'Bend your elbows to lower the top of your head towards the floor, just in front of your hands.',
            'Press back up until your arms are straight, keeping your hips high.',
        ],
        tips: ['Too easy? Put your feet up on a bench or step.'],
    },
    'builtin:dead-hang': {
        description:
            'You hang from a bar with your arms straight for as long as you can. Builds your grip and stretches your shoulders.',
        steps: [
            'Grip the bar about shoulder-width apart, palms facing away.',
            'Lift your feet, or step off a box, so you hang with your arms straight.',
            'Let your body relax and hang still, breathing steadily, until the time is up.',
        ],
        tips: [
            'Keep your feet just off the floor, or a box under you, so you can step down when your grip goes.',
        ],
    },
    // Eighth batch: conditioning and abs
    'builtin:burpee': {
        description:
            'From standing, you drop to a push-up, jump your feet back in and jump up. Works nearly everything and gets you breathing hard.',
        steps: [
            'Stand tall with your feet shoulder-width apart.',
            'Squat down, put your hands on the floor, and jump your feet back into a push-up position.',
            'Do a push-up, then jump your feet back in towards your hands.',
            'Jump straight up, reaching your arms overhead, and land softly into the next one.',
        ],
        tips: [
            'Too hard? Step your feet back and in instead of jumping, and leave out the push-up.',
            "Keep your body straight when your feet land back; don't let your hips sag.",
        ],
    },
    'builtin:mountain-climber': {
        description:
            'From a push-up position, you drive your knees to your chest in turn, quickly. Works your abs and gets your heart going.',
        steps: [
            'Start in a push-up position, hands under your shoulders and your body in a straight line.',
            'Bring one knee towards your chest, then step it back as you bring the other knee in.',
            'Keep swapping legs at a steady, quick pace until the time is up.',
        ],
        tips: [
            'Keep your hips level with your shoulders; letting them rise makes it easier than it should be.',
            'Too hard? Slow down and step each foot in, rather than running.',
        ],
    },
    'builtin:jumping-jack': {
        description:
            'You jump your feet out wide as your arms go up overhead, then jump back. A simple way to warm up or get breathing hard.',
        steps: [
            'Stand tall with your feet together and your arms by your sides.',
            'Jump your feet out wider than your shoulders, swinging your arms out and up over your head.',
            'Jump your feet back together as your arms come down to your sides, and keep going.',
        ],
        tips: [
            'Land softly on the balls of your feet.',
            'No jumping? Step one foot out to the side at a time instead.',
        ],
    },
    'builtin:jump-squat': {
        description:
            'A squat where you jump as high as you can on the way up. Builds power in your legs.',
        steps: [
            'Stand with your feet shoulder-width apart, arms by your sides.',
            'Sit your hips back and down into a squat, swinging your arms back.',
            'Push hard through your feet to jump straight up, swinging your arms forward.',
            'Land softly with your knees bent, and go straight down into the next squat.',
        ],
        tips: [
            "Land quietly: if you're thudding down, bend your knees more as you land.",
            "Knees follow your toes; don't let them cave in when you land.",
        ],
    },
    'builtin:box-jump': {
        description:
            'You jump from the floor up onto a sturdy box, landing softly. Trains your legs to push hard and fast.',
        steps: [
            'Stand facing a sturdy box about a step away, feet hip-width apart.',
            'Swing your arms back as you dip into a quarter squat.',
            'Swing your arms forward and jump up onto the box, landing softly on both feet with your knees bent.',
            'Stand up tall on the box, then step back down one foot at a time.',
        ],
        tips: [
            "Step down rather than jumping back off; it's far kinder on your ankles and knees.",
            'Start with a low box: if you land in a deep squat, it is too high.',
        ],
    },
    'builtin:bodyweight-squat': {
        description:
            'A squat with no weight: you sit down and stand back up. A good warm-up, and the place to start before adding weight.',
        steps: [
            'Stand with your feet shoulder-width apart, toes turned out a little, arms out in front of you.',
            'Sit your hips back and down, chest up, until your thighs are at least level with the floor.',
            'Push through your whole foot to stand back up.',
        ],
        tips: [
            "Knees follow your toes; don't let them cave in.",
            'Heels lifting? Turn your toes out a little more, and sit back as if onto a chair.',
        ],
    },
    'builtin:wall-sit': {
        description:
            'With your back flat against a wall, you hold a sitting position with no chair. Works your quads without moving.',
        steps: [
            'Stand with your back against a wall, feet hip-width apart and about a stride out from it.',
            'Slide down the wall until your thighs are level with the floor and your knees are at a right angle.',
            'Keep your back flat against the wall and hold, breathing steadily, until the time is up.',
            'Slide back up the wall to stand.',
        ],
        tips: [
            'Keep your knees over your ankles; move your feet further out if they come past your toes.',
            'Too hard? Stop higher up the wall. Too easy? Rest a weight on your thighs.',
        ],
    },
    'builtin:crunch': {
        description:
            'Lying on your back, you curl your shoulders up off the floor towards your knees. The simplest move for your abs.',
        steps: [
            'Lie on your back with your knees bent, feet flat, and your hands lightly by your ears or crossed on your chest.',
            'Breathe out and curl your head and shoulders off the floor, bringing your ribs towards your hips.',
            'Lower your shoulders back to the floor slowly.',
        ],
        tips: [
            "Don't pull on your head with your hands; they're only resting there.",
            "Your lower back stays on the floor: it's a small curl, not a sit-up.",
        ],
    },
    'builtin:bicycle-crunch': {
        description:
            'Lying on your back, you bring each elbow to the opposite knee in turn, pedalling your legs. Works the sides of your middle.',
        steps: [
            'Lie on your back with your hands lightly by your ears and your knees lifted over your hips.',
            'Curl your shoulders up, then bring your right knee in and turn your left elbow towards it, straightening your left leg.',
            'Swap sides: bring your left knee in and turn your right elbow towards it, straightening your right leg.',
            'Keep going from side to side, slowly, with your shoulders off the floor.',
        ],
        tips: [
            'Turn your shoulders, not just your elbows: slow and controlled counts for more than fast.',
            'Count each side as a rep, or each pair, but always count the same way.',
        ],
    },
    'builtin:ab-wheel-rollout': {
        description:
            'Kneeling with your hands on an ab wheel, you roll it out in front of you and pull it back. Hard work for your abs.',
        steps: [
            "Kneel on a mat holding the ab wheel's handles, the wheel on the floor under your shoulders.",
            'Brace your middle and roll the wheel forward slowly, letting your body lower towards the floor.',
            'Go as far as you can without your lower back sagging.',
            'Pull the wheel back towards your knees with your abs, to come back to the start.',
        ],
        tips: [
            'Start with short rollouts, and go further as you get stronger.',
            'Too easy? Do it from your feet instead of your knees.',
        ],
    },
    // Ninth batch: kettlebells, including kettlebell takes on dumbbell exercises
    'builtin:kettlebell-thruster': {
        description:
            'A squat that flows straight into pressing a kettlebell overhead. Works your legs and shoulders, and gets your heart going.',
        steps: [
            'Hold a kettlebell at your shoulder, or one at each, the bell resting on the outside of your forearm.',
            'Stand with your feet a little wider than your shoulders and sit down into a squat, elbows tucked in.',
            'Drive up out of the squat, and use that push to press the kettlebell straight overhead.',
            'Bring it back to your shoulder as you sit down into the next squat.',
        ],
        tips: [
            'Make it one smooth movement: the press starts as your legs straighten, not after.',
            'With one kettlebell, do all your reps on one side, then swap.',
        ],
    },
    'builtin:kettlebell-clean-and-press': {
        description:
            'You swing a kettlebell up to rest at your shoulder, then press it overhead. A whole-body lift with one weight.',
        steps: [
            'Stand with your feet a little wider than your shoulders, the kettlebell on the floor in front of you.',
            'Hike it back between your legs with one hand, then snap your hips forward and pull it up close to your body.',
            'Let it roll round your hand to rest at your shoulder, on the outside of your forearm, wrist straight.',
            'Press it straight overhead until your arm is straight, then lower it to your shoulder and let it drop back down.',
        ],
        tips: [
            'Keep the bell close as it comes up, so it lands softly instead of banging your forearm.',
            'Do all your reps on one side, then swap.',
        ],
    },
    'builtin:kettlebell-snatch': {
        description:
            'In one movement, you swing a kettlebell from between your legs to straight overhead. Powerful hips and hard conditioning.',
        steps: [
            'Stand with your feet a little wider than your shoulders, the kettlebell on the floor in front of you.',
            'Hike it back between your legs with one hand, then snap your hips forward to send it up.',
            'As it rises, keep it close and punch your hand up through the handle, so it lands softly overhead.',
            'Let it drop back between your legs, pushing your hips back, and go straight into the next one.',
        ],
        tips: [
            'Bruised forearm? Punch your hand through sooner, rather than letting the bell flip over.',
            "Learn the kettlebell swing first: the snatch is a swing that doesn't stop at chest height.",
        ],
    },
    'builtin:kettlebell-pistol-squat': {
        description:
            'A squat on one leg, the other held out straight in front, with a kettlebell at your chest. Leg strength and balance.',
        steps: [
            'Hold a kettlebell by its horns against your chest, and stand on one leg.',
            'Lift the other leg out straight in front of you, and push the kettlebell forward a little to help you balance.',
            'Sit down as low as you can on your standing leg, keeping its heel on the floor.',
            'Push through your whole foot to stand back up. Do all your reps, then swap legs.',
        ],
        tips: [
            'A light kettlebell held out in front often makes balancing easier, not harder.',
            "Can't go all the way down yet? Squat down to a bench or box behind you.",
        ],
    },
    'builtin:kettlebell-floor-press': {
        description:
            'Lying on the floor, you press a kettlebell up from your chest with one arm. A bench press with no bench.',
        steps: [
            'Lie on your side next to the kettlebell, grip its handle with both hands, and roll onto your back with it.',
            'Bend your knees, feet flat, and take one hand away. The bell rests on the outside of your forearm.',
            'Press it straight up over your shoulder until your arm is straight.',
            'Lower it until your upper arm touches the floor, then press again. Do all your reps, then swap sides.',
        ],
        tips: [
            'Let your upper arm rest on the floor for a moment each rep, without bouncing off it.',
            'Keep your wrist straight, not bent back by the weight of the bell.',
        ],
    },
    'builtin:turkish-get-up': {
        description:
            'You go from lying down to standing with a kettlebell held overhead, then back down. Strength, balance and steady shoulders.',
        steps: [
            'Lie on your back holding a kettlebell straight up in your right hand, right knee bent, left arm out to the side.',
            'Eyes on the bell, roll up onto your left elbow, then your left hand, keeping your right arm straight.',
            'Lift your hips, sweep your left leg back under you to kneel, and turn your body upright.',
            'Stand up from the kneel, the bell still overhead and your arm straight.',
            'Go back down the same way, one step at a time. Do all your reps, then swap sides.',
        ],
        tips: [
            'Learn it with no weight, or a shoe balanced on your fist, before using a kettlebell.',
            'Go slowly: each step is a position to hold, not a rush to the top.',
        ],
    },
    'builtin:kettlebell-sumo-high-pull': {
        description:
            'From a wide stance, you stand up with a kettlebell and pull it up to your chin. Works your legs and upper back together.',
        steps: [
            'Stand with your feet wide, toes turned out, the kettlebell on the floor between them.',
            'Squat down and grip the handle with both hands, back flat, chest up.',
            'Stand up fast and keep it moving, pulling the handle up to your chin, elbows high and wide.',
            'Lower it until your arms are straight, then sit back down to touch the bell to the floor.',
        ],
        tips: [
            'Your legs start it and your arms finish it: stand up first, then pull.',
            'Stand tall at the top, rather than leaning back to get the bell higher.',
        ],
    },
    'builtin:chainsaw-row': {
        description:
            'From a split stance, leaning on your front thigh, you pull a kettlebell up to your hip. A one-arm row with no bench.',
        steps: [
            'Step your left foot forward and lean forward, resting your left forearm on your left thigh, back flat.',
            'Hold a kettlebell or dumbbell in your right hand, hanging below your shoulder with your arm straight.',
            'Pull it up towards your hip, elbow close to your side, as if starting a chainsaw.',
            'Lower it slowly, then do all your reps before swapping sides.',
        ],
        tips: ["Keep your shoulders square to the floor; if you twist to lift it, it's too heavy."],
    },
    'builtin:kettlebell-reverse-crunch': {
        description:
            'Lying on your back holding a kettlebell behind your head, you curl your hips up off the floor. Hard work for your abs.',
        steps: [
            'Lie on your back with a heavy kettlebell on the floor behind your head, and hold its handle with both hands.',
            'Lift your legs, knees bent at a right angle, so your knees are over your hips.',
            'Breathe out and curl your hips up off the floor, bringing your knees towards your chest.',
            'Lower your hips slowly back down, without letting your feet touch the floor.',
        ],
        tips: [
            "Lift with your abs, not by swinging your legs: it's a small, slow curl.",
            'Too easy? Straighten your legs more as you get stronger.',
        ],
    },
    'builtin:plank-pull-through': {
        description:
            'Holding a plank on your hands, you drag a kettlebell from side to side underneath you. Builds a middle that resists twisting.',
        steps: [
            'Get into a plank on your hands, feet a little wider than your hips, a kettlebell beside your left hand.',
            'Reach under your body with your right hand and drag the kettlebell across to your right side.',
            'Put your hand back down, then reach under with your left hand and drag it back.',
            'Keep your hips level and still the whole time.',
        ],
        tips: [
            'Feet wider apart makes it easier to keep your hips still; closer together makes it harder.',
            'Count each drag as a rep, or each pair, but always count the same way.',
        ],
    },
    'builtin:half-kneeling-kettlebell-press': {
        description:
            "Kneeling on one knee, you press a kettlebell overhead with one hand. Your legs can't help, so your shoulder does it all.",
        steps: [
            'Kneel on your right knee, left foot flat in front of you, both knees at right angles.',
            'Hold a kettlebell at your right shoulder, the bell resting on the outside of your forearm.',
            'Squeeze your right glute, brace your middle, and press the bell up until your arm is straight.',
            'Lower it slowly back to your shoulder. Do all your reps, then swap sides and knees.',
        ],
        tips: [
            "Don't lean away from the bell to get it up; stay tall, and go lighter if you have to.",
        ],
    },
    'builtin:kettlebell-halo': {
        description:
            'You circle a kettlebell around your head, holding it upside down by its horns. Keeps your shoulders strong and moving well.',
        steps: [
            'Stand tall, or kneel, holding a kettlebell upside down by its horns in front of your chest.',
            'Circle it round one side of your head, then behind your head, close to your neck.',
            "Bring it round the other side and back to your chest. That's one rep.",
            'Do half your reps one way, then half the other.',
        ],
        tips: [
            'Keep it close to your head and go slowly; this is about control, not weight.',
            "Squeeze your glutes so your lower back doesn't arch as the bell goes behind you.",
        ],
    },
    'builtin:kettlebell-around-the-world': {
        description:
            'Standing tall, you pass a kettlebell from hand to hand around your waist. Works your grip and holds your middle steady.',
        steps: [
            'Stand tall, feet hip-width apart, holding a kettlebell by its handle in your right hand.',
            'Swing it round your right side and behind you, and pass it to your left hand behind your back.',
            "Bring it round your left side to the front and pass it back to your right hand. That's one rep.",
            'Do half your reps one way, then half the other.',
        ],
        tips: ['Keep your hips facing forward: only the bell goes round.'],
    },
    'builtin:kettlebell-push-up': {
        description:
            'A push-up with your hands on the handles of two kettlebells. Lets you go lower than you can on the floor.',
        steps: [
            'Set two kettlebells upright on the floor, a little wider than your shoulders, and grip their handles.',
            'Step your feet back into a plank, wrists straight and body in one straight line.',
            'Lower yourself until your chest is between the handles, elbows angled back a little.',
            'Push back up until your arms are straight.',
        ],
        tips: [
            'Only one kettlebell? Put one hand on it and the other on the floor, and swap each set.',
            "Use bells with flat bases on a floor that grips, so they can't roll.",
        ],
    },
    'builtin:kettlebell-lunge': {
        description:
            'With a kettlebell in each hand, or one at your chest, you step forward and drop your back knee towards the floor.',
        steps: [
            'Stand tall with a kettlebell in each hand by your sides, or one held by its horns against your chest.',
            'Take a long step forward and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to step back to standing.',
            'Swap legs each time, or do all your reps on one leg, then the other.',
        ],
        tips: [
            'Only one kettlebell? Hold it at your chest; it helps you stay upright, too.',
            'Count each leg as a rep, or each pair, but always count the same way.',
        ],
    },
    'builtin:kettlebell-curl': {
        description:
            'Standing, you bend your elbows to lift a kettlebell from your thighs to your chest. Works your biceps and grip.',
        steps: [
            'Stand tall holding a kettlebell by its horns, arms straight, the bell hanging in front of your thighs.',
            'Keeping your elbows by your sides, bend them to lift it towards your chest.',
            'Lower it slowly until your arms are straight.',
        ],
        tips: [
            "If you're swinging your body to lift it, it's too heavy.",
            'Got two? Hold one by its handle in each hand, the bells hanging below, and curl them together.',
        ],
    },
    'builtin:kettlebell-press': {
        description:
            'Standing, you press a kettlebell from your shoulder to straight overhead, one arm at a time.',
        steps: [
            'Swing the kettlebell up to your shoulder, or lift it there with both hands. It rests on the outside of your forearm.',
            'Stand tall with your feet hip-width apart. Squeeze your glutes and brace your middle.',
            'Press it straight up until your arm is straight and your biceps is by your ear.',
            'Lower it slowly back to your shoulder. Do all your reps, then swap sides.',
        ],
        tips: [
            "Don't lean away to get it up; if you have to, it's too heavy.",
            'Squeeze the handle hard; it makes the press feel steadier.',
        ],
    },
    // Tenth batch: stretches and mobility
    'builtin:downward-dog': {
        description:
            'From your hands and feet, you push your hips up and back into an upside-down V. Loosens your hamstrings, calves and shoulders.',
        steps: [
            'Start on your hands and knees, hands just in front of your shoulders, fingers spread.',
            'Tuck your toes under and push your hips up and back, straightening your legs as far as is comfortable.',
            'Press the floor away so your arms and back make one long line, and let your head hang between your arms.',
            'Ease your heels towards the floor and hold, breathing slowly. Lower your knees to come out of it.',
        ],
        tips: [
            'Tight hamstrings? Keep your knees bent: a long, flat back matters more than straight legs.',
            'Ease into it and hold still. Never bounce, and back off if it hurts rather than stretches.',
        ],
    },
    'builtin:childs-pose': {
        description:
            'Kneeling, you sit back towards your heels and fold forward, arms out in front. A gentle stretch for your back, and a rest.',
        steps: [
            'Kneel with your big toes touching and your knees about hip-width apart, or wider.',
            'Sit back towards your heels, then walk your hands forward and lower your chest towards the floor.',
            'Rest your forehead on the floor, arms long in front of you, and let your back relax.',
            'Breathe slowly and hold, then walk your hands back in to sit up.',
        ],
        tips: [
            "Can't sit back that far? Put a folded towel between your heels and your bottom, or under your forehead.",
            'Walk your hands over to one side, then the other, to stretch down each side of your back.',
        ],
    },
    'builtin:cat-cow': {
        description:
            'On your hands and knees, you round your back up, then let it dip, in time with your breath. A gentle way to loosen your back.',
        steps: [
            'Start on your hands and knees, hands under your shoulders and knees under your hips.',
            'Breathe out and round your back up towards the ceiling, tucking your chin and tailbone under.',
            'Breathe in and let your stomach sink towards the floor, lifting your chest and looking ahead.',
            'Keep flowing slowly between the two, with your breath, until the time is up.',
        ],
        tips: [
            'Move your whole back, a little at a time, from your neck to your tailbone, not just your lower back.',
            'Only go as far as is comfortable each way; it should never pinch.',
        ],
    },
    'builtin:cobra-stretch': {
        description:
            'Lying face down, you press your chest up off the floor, keeping your hips down. Stretches your abs and the front of your body.',
        steps: [
            'Lie face down, legs straight and the tops of your feet on the floor, hands flat under your shoulders.',
            'Press into your hands to lift your chest, keeping your hips and legs on the floor.',
            'Straighten your arms only as far as your lower back is comfortable, shoulders down away from your ears.',
            'Hold, breathing steadily, then lower yourself slowly back to the floor.',
        ],
        tips: [
            'Feel a pinch in your lower back? Come down lower, or rest on your forearms instead of your hands.',
            'Keep your neck long and look at the floor a little ahead, not up at the ceiling.',
        ],
    },
    'builtin:kneeling-hip-flexor-stretch': {
        description:
            'Kneeling on one knee, you ease your hips forward. Loosens the front of the hip and thigh of the leg behind you.',
        steps: [
            'Kneel on your left knee with your right foot flat in front of you, both knees bent at about a right angle.',
            'Stand tall through your body, squeeze your left glute and tuck your hips under a little.',
            'Ease your hips forward until you feel a stretch at the front of your left hip, keeping your body upright.',
            'Hold, breathing steadily, then swap legs.',
        ],
        tips: [
            'Put a folded towel or mat under your back knee if the floor is hard.',
            "Don't arch your lower back to go further: tucking your hips under is what makes the stretch.",
        ],
    },
    'builtin:standing-quad-stretch': {
        description:
            'Standing on one leg, you pull your other heel up behind you. A simple stretch for the front of your thigh.',
        steps: [
            'Stand tall on your left leg, a hand on a wall or chair for balance if you need it.',
            'Bend your right knee and hold your right foot or ankle behind you with your right hand.',
            'Draw your heel gently towards your bottom, knees side by side, until you feel a stretch down the front of your thigh.',
            'Hold, standing tall, then let go and swap legs.',
        ],
        tips: [
            "Keep your knee pointing at the floor; don't let it drift forward or out to the side.",
            'Tuck your hips under a little to feel it more, rather than pulling harder on your foot.',
        ],
    },
    'builtin:seated-hamstring-stretch': {
        description:
            'Sitting with your legs straight out, you fold forward from your hips towards your toes. Loosens your hamstrings and calves.',
        steps: [
            'Sit on the floor with your legs straight out in front of you, feet together and toes pointing up.',
            'Sit up tall, then fold forward from your hips, sliding your hands along your legs.',
            'Stop where you feel a stretch down the backs of your legs, and rest your hands on your shins, ankles or feet.',
            'Hold, breathing slowly and easing a little further as your legs relax, then sit back up.',
        ],
        tips: [
            'Lead with your chest, not your head: reaching forward with a long back stretches more than rounding over.',
            'Ease into it and hold still; never bounce to reach further.',
        ],
    },
    'builtin:pigeon-stretch': {
        description:
            'With one shin across the floor in front of you and the other leg straight behind, you sink your hips. A deep stretch for your glutes.',
        steps: [
            'Start on your hands and knees. Bring your right knee forward behind your right hand, your shin angled across towards your left hip.',
            'Slide your left leg straight back behind you, the top of your foot on the floor.',
            'Keep your hips square and lower them towards the floor, staying up on your hands or folding forward onto your forearms.',
            'Hold, breathing slowly, then come back to your hands and knees and swap legs.',
        ],
        tips: [
            'Feel it in your knee? Bring your front heel in closer to your hips, or put a cushion under that hip.',
            'Let your hips sink as they relax, rather than forcing them down.',
        ],
    },
    'builtin:worlds-greatest-stretch': {
        description:
            'A lunge with a twist: you drop an elbow towards your front foot, then reach that arm to the ceiling. Loosens your hips and upper back.',
        steps: [
            'From standing, take a long step forward with your right foot into a lunge, your back leg straight.',
            'Put your left hand on the floor inside your right foot, and lower your right elbow towards your right instep.',
            'Turn your chest to the right and reach your right arm up to the ceiling, following your hand with your eyes.',
            'Bring your hand back down and step back to standing. Swap legs each time, or do all your reps on one side first.',
        ],
        tips: [
            'Take your time: pause for a breath at each part rather than rushing through.',
            'Count each side as a rep, or each pair, but always count the same way.',
        ],
    },
    'builtin:thread-the-needle': {
        description:
            'On your hands and knees, you reach one arm under your body, then up to the ceiling. Loosens your upper back and shoulders.',
        steps: [
            'Start on your hands and knees, hands under your shoulders and knees under your hips.',
            'Slide your right hand under your left arm, palm up, lowering your right shoulder and the side of your head towards the floor.',
            'Pause, then sweep your right arm back out and up to the ceiling, turning your chest and following your hand with your eyes.',
            "That's one rep. Do all your reps, then swap sides.",
        ],
        tips: [
            'Keep your hips over your knees as you turn; the twist comes from your upper back.',
            'Rather hold it? Rest in the threaded position for a few slow breaths each side.',
        ],
    },
    // Eleventh batch: resistance bands
    'builtin:band-row': {
        description:
            'Sitting with a band round your feet, you pull the ends to your belly. Works your upper back, with nothing to tie it to.',
        steps: [
            'Sit tall with your legs out in front, knees soft, and loop the middle of the band round the soles of your feet.',
            'Hold an end in each hand, arms straight, with the band a little tight.',
            'Pull your hands to your belly, elbows close to your sides, squeezing your shoulder blades together.',
            'Let your arms straighten slowly, keeping your back tall.',
        ],
        tips: [
            "Don't lean back to pull: your body stays still and only your arms move.",
            'Too easy? Hold the band shorter, or use a stronger one.',
        ],
    },
    'builtin:band-chest-press': {
        description:
            'With a band round your upper back, you press the ends out in front of you. Works your chest anywhere, with nothing to tie it to.',
        steps: [
            'Stand tall with the band across your upper back, under your arms, an end in each hand by your chest.',
            'Press both hands straight out in front of you at chest height until your arms are straight.',
            'Bring your hands back to your chest slowly, against the band.',
        ],
        tips: [
            'Keep your shoulders down and your wrists straight as you press.',
            'Too easy? Wrap the ends round your hands to shorten the band, or step one foot forward and lean in.',
        ],
    },
    'builtin:band-overhead-press': {
        description:
            'Standing on a band, you press the ends from your shoulders to overhead. Works your shoulders, and your middle holds you steady.',
        steps: [
            'Stand on the middle of the band, feet hip-width apart, and hold an end in each hand at your shoulders.',
            'Brace your middle and press your hands straight up until your arms are straight overhead.',
            'Lower your hands slowly back to your shoulders.',
        ],
        tips: [
            "Don't lean back to get the band up: squeeze your glutes and keep your ribs down.",
            'Too easy? Stand with your feet wider on the band, or use a stronger one.',
        ],
    },
    'builtin:band-face-pull': {
        description:
            'With a band tied at head height, you pull it towards your face, hands apart. Good for the backs of your shoulders.',
        steps: [
            'Tie the band to a post or door anchor at head height, and hold an end in each hand, thumbs towards you.',
            'Step back until your arms are straight and the band is a little tight.',
            'Pull towards your face, elbows high, so your hands finish beside your ears.',
            'Let your arms straighten slowly.',
        ],
        tips: ['Keep it light and slow: this is about control, not how hard the band is.'],
    },
    'builtin:band-curl': {
        description:
            'Standing on a band, you curl the ends up to your shoulders. Works your biceps, and the band pulls hardest at the top.',
        steps: [
            'Stand on the middle of the band, feet hip-width apart, an end in each hand, palms facing forward.',
            'Keeping your elbows by your sides, curl your hands up towards your shoulders.',
            'Lower them slowly until your arms are straight.',
        ],
        tips: [
            'Keep your elbows still: if they swing forward, your shoulders are doing the work.',
            'Too easy? Stand with your feet wider on the band.',
        ],
    },
    'builtin:band-triceps-pushdown': {
        description:
            'With a band tied up high, you push the ends down until your arms are straight. Works the backs of your arms.',
        steps: [
            'Tie the band over a door or to something high, and hold an end in each hand.',
            'Stand tall, tuck your elbows in at your sides, and start with your hands at chest height.',
            'Push your hands down until your arms are straight, then let them come back up slowly.',
        ],
        tips: ['Only your forearms move: keep your elbows pinned to your sides.'],
    },
    'builtin:band-squat': {
        description:
            'Standing on a band with the ends at your shoulders, you squat down and stand back up. Works your legs and glutes at home.',
        steps: [
            'Stand on the middle of the band, feet shoulder-width apart, holding the ends at your shoulders.',
            'Sit your hips back and down, knees over your toes, until your thighs are level with the floor or as low as is comfortable.',
            'Push through your whole foot to stand back up, against the band.',
        ],
        tips: [
            'Keep your chest up and your heels down all the way.',
            'Too easy? Use a stronger band, or slow down on the way down.',
        ],
    },
    'builtin:band-pull-through': {
        description:
            'With a band tied low behind you, you hinge forward and pull it through your legs as you stand. Works your glutes and hamstrings.',
        steps: [
            'Tie the band low to a post, face away from it, and hold the band in both hands between your legs.',
            'Walk forward until the band is tight, feet a little wider than your hips.',
            'Push your hips back, letting your hands go back through your legs, with a flat back and soft knees.',
            'Squeeze your glutes and push your hips forward to stand tall.',
        ],
        tips: [
            "It's a hip movement: your arms just hold the band, they don't pull it.",
            "Don't lean back at the top; stand tall and stop.",
        ],
    },
    'builtin:band-lateral-walk': {
        description:
            'With a small band round your legs, you step sideways in a half squat. Works the sides of your hips and your glutes.',
        steps: [
            'Put a small loop band round your legs, just above your knees or round your ankles.',
            'Stand with your feet hip-width apart, then bend your knees and sit back a little.',
            'Step sideways with one foot, then follow with the other, keeping the band tight.',
            'Take your steps one way, then the same back the other way.',
        ],
        tips: [
            'Keep your knees pushed out and your toes forward, not turned out.',
            'Stay low the whole time; standing up between steps makes it easier.',
        ],
    },
    'builtin:pallof-press': {
        description:
            'Side-on to a band or cable, you press your hands out and hold them still. Works your middle by not letting it twist.',
        steps: [
            'Tie the band at chest height, or set a cable there, and stand side-on to it, holding it at your chest in both hands.',
            'Step away until it pulls, feet hip-width apart and knees soft.',
            'Press your hands straight out in front of your chest, and hold for a moment without turning.',
            'Bring your hands back to your chest. Do all your reps, then turn round for the other side.',
        ],
        tips: [
            'The band tries to turn you: keep your hips and shoulders facing straight ahead.',
            'Too easy? Step further away from where the band is tied.',
        ],
    },
};
