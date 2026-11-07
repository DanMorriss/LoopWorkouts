import {
    BackSide,
    BoxGeometry,
    BufferGeometry,
    CanvasTexture,
    Color,
    CylinderGeometry,
    DirectionalLight,
    Group,
    Material,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    PCFShadowMap,
    PerspectiveCamera,
    Quaternion,
    RingGeometry,
    Scene,
    ShaderMaterial,
    ShadowMaterial,
    SphereGeometry,
    SRGBColorSpace,
    TorusGeometry,
    Vector3,
    WebGLRenderer,
} from 'three';
import { BodyModel } from '../../../models/body-model';
import { BodyFigure, MuscleGroup } from '../../../models/exercise';
import { BODY, ExerciseMotion, muscleTone, Pose } from '../../../models/exercise-motion';
import {
    add3,
    cross3,
    dot3,
    length3,
    Limb3,
    motionJoints,
    normalize3,
    rotateAbout,
    scale3,
    SHOULDER_SPREAD,
    Skeleton,
    skeletonOf,
    sub3,
    Vec3,
} from '../../../models/exercise-skeleton';
import { Body, buildBody, frame, paintDrawings, restHand, restJoint } from './figure-body';

/**
 * The 3D figure of an exercise's demo (EXR-13), drawn with three.js to look as the body map
 * does: the body map's figure, painted with its own drawings (see `figure-body.ts`), flat and
 * outlined, with its kit, on a floor. Loaded only when a demo is shown. See
 * `exercise-skeleton.ts` for how it's posed.
 */

/** The page's colours to draw with, as CSS colours, as the body map uses them. */
export interface FigureColors {
    readonly main: string;
    readonly supporting: string;
    readonly idle: string;
    readonly other: string;
    /** The body map's lines: see-through, over the page. */
    readonly outline: string;
    readonly page: string;
    /** Bars and other metal. */
    readonly metal: string;
}

/** How thick the outline round the figure and its kit is, in CSS pixels, as the body map's. */
const OUTLINE_PX = 1.5;

let renderer: WebGLRenderer | null | undefined;

/**
 * The one WebGL renderer every demo draws with, copying each picture onto its own canvas, so
 * there's never more than one WebGL context, however many demos are shown. Null without WebGL.
 */
function sharedRenderer(): WebGLRenderer | null {
    if (renderer === undefined) {
        try {
            renderer = new WebGLRenderer({ antialias: true, alpha: true });
            renderer.outputColorSpace = SRGBColorSpace;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = PCFShadowMap;
            renderer.setClearColor(0x000000, 0);
        } catch {
            renderer = null;
        }
    }
    return renderer;
}

/** Whether the 3D figure can be drawn here. */
export const canDraw3d = () => sharedRenderer() !== null;

/** Lets the page have the main thread for a moment, between steps of getting a figure ready. */
function nextTask(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve));
}

/** How a figure is shaded: the theme's colours, and the exercise's muscles. */
export interface FigureLook {
    readonly colors: FigureColors;
    readonly main: readonly MuscleGroup[];
    readonly supporting: readonly MuscleGroup[];
}

/**
 * Makes the figure of `motion`, shaded as `look`, and gets it ready to draw: built, painted,
 * its painting sent to the GPU and its shaders compiled (in the background, where the browser
 * can), each step a task of its own, so the page stays free to scroll and be pressed while it
 * happens. Done all at once, the first frame of an exercise's page held it up for seconds on a
 * slow phone. Null if `cancelled()` by then, or the figure can't be drawn.
 */
export async function prepareScene(
    motion: ExerciseMotion,
    figure: BodyFigure,
    look: () => FigureLook,
    cancelled: () => boolean
): Promise<FigureScene | null> {
    await nextTask();
    const gl = sharedRenderer();
    if (!gl || cancelled()) {
        return null;
    }
    const scene = new FigureScene(motion, figure);
    const steps = [
        () => scene.setLook(look()),
        () => scene.paintIfStale(),
        () => gl.initTexture(scene.texture),
        () => gl.compileAsync(scene.scene, scene.camera),
    ];
    for (const step of steps) {
        await nextTask();
        if (cancelled()) {
            scene.dispose();
            return null;
        }
        await step();
    }
    return scene;
}

const v = (point: Vec3) => new Vector3(point[0], point[1], point[2]);

/** Orthogonal to `along`, the part of `way` that is, made unit length; `fallback` if none. */
function square(way: Vec3, along: Vec3, fallback: Vec3): Vec3 {
    const off = sub3(way, scale3(along, dot3(way, along)));
    return length3(off) > 1e-4 ? normalize3(off) : fallback;
}

/** Turns `object` so its +y points along `y` and its +z along `z` (square to `y`). */
function orient(object: Object3D, y: Vec3, z: Vec3) {
    const yAxis = normalize3(y);
    const zAxis = square(z, yAxis, square([1, 0, 0], yAxis, [0, 0, 1]));
    const xAxis: Vec3 = [
        yAxis[1] * zAxis[2] - yAxis[2] * zAxis[1],
        yAxis[2] * zAxis[0] - yAxis[0] * zAxis[2],
        yAxis[0] * zAxis[1] - yAxis[1] * zAxis[0],
    ];
    object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(v(xAxis), v(yAxis), v(zAxis)));
}

/** `front` turned by the least turn that takes `from` to `to`. */
function carry(from: Vec3, to: Vec3, front: Vec3): Vec3 {
    const turned = v(front).applyQuaternion(new Quaternion().setFromUnitVectors(v(from), v(to)));
    return [turned.x, turned.y, turned.z];
}

/** A matrix taking a part from rest (`restAt`, facing `rest`) to `at`, facing `posed`, stretched `stretch` along its y. */
function moveMatrix(
    restAt: Vec3,
    rest: [Vec3, Vec3, Vec3],
    at: Vec3,
    posed: [Vec3, Vec3, Vec3],
    stretch: readonly [number, number, number] = [1, 1, 1]
): Matrix4 {
    const restBasis = new Matrix4().makeBasis(v(rest[0]), v(rest[1]), v(rest[2]));
    const posedBasis = new Matrix4().makeBasis(v(posed[0]), v(posed[1]), v(posed[2]));
    return new Matrix4()
        .makeTranslation(at[0], at[1], at[2])
        .multiply(posedBasis)
        .multiply(new Matrix4().makeScale(...stretch))
        .multiply(restBasis.transpose())
        .multiply(new Matrix4().makeTranslation(-restAt[0], -restAt[1], -restAt[2]));
}

/**
 * The outline drawn round a mesh: its back faces, pushed out along their normals by
 * `thickness` and filled with the outline's colour, show round its edges.
 */
function outlineMaterial() {
    return new ShaderMaterial({
        uniforms: { thickness: { value: 1 }, color: { value: new Color() } },
        vertexShader: `
            uniform float thickness;
            void main() {
                vec3 pushed = position + normalize(normal) * thickness;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pushed, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            void main() {
                gl_FragColor = vec4(color, 1.0);
                #include <colorspace_fragment>
            }
        `,
        side: BackSide,
    });
}

/** A CSS colour as it shows over `under`, so a see-through one can be drawn solid. */
function over(color: string, under: string): Color {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) {
        return new Color(0x808080);
    }
    context.fillStyle = under;
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return new Color(`rgb(${r}, ${g}, ${b})`);
}

/** One exercise's figure, its kit and floor, to draw in any pose from any way round. */
export class FigureScene {
    /** The width of the drawing over its height, at its best. */
    readonly aspect: number;

    /** The scene, camera and painting, for prepareScene() to get ready. */
    readonly scene = new Scene();
    readonly camera: PerspectiveCamera;
    private readonly target: Vector3;
    /** How far the figure and its kit reach round the upright line through `target`. */
    private readonly radius: number;
    private readonly height: number;

    private readonly body: Body;
    private readonly model: BodyModel;
    private readonly painting = document.createElement('canvas');
    readonly texture = new CanvasTexture(this.painting);
    private readonly bodyMaterial = new MeshBasicMaterial({ map: this.texture });
    private readonly kitMaterial = new MeshBasicMaterial();
    private readonly metalMaterial = new MeshBasicMaterial();
    private readonly outline = outlineMaterial();
    private readonly floorMaterial = new MeshBasicMaterial();
    private readonly shadowMaterial = new ShadowMaterial({ opacity: 0.18 });
    /** Geometry and textures made for it, to free with it. */
    private readonly owned: { dispose(): void }[] = [];

    private readonly parts: {
        readonly torso: Mesh;
        readonly neck: Mesh;
        readonly head: Mesh;
        readonly upperArms: readonly Mesh[];
        readonly forearms: readonly Mesh[];
        readonly hands: readonly Mesh[];
        readonly thighs: readonly Mesh[];
        readonly shins: readonly Mesh[];
        readonly feet: readonly Mesh[];
    };
    /** The torso as made, to turn it a little more up the back for a twist. */
    private readonly torsoRest: { position: Float32Array; normal: Float32Array };
    /** What the torso was last shaped for, so it's only shaped again when that changes. */
    private torsoShapedFor = '';
    /** Kit that moves with the figure, placed each frame. */
    private readonly carried: ((skeleton: Skeleton) => void)[] = [];

    private main: readonly MuscleGroup[] = [];
    private supporting: readonly MuscleGroup[] = [];
    private colors: FigureColors | null = null;
    /** The look's changed since the figure was painted, so it's painted before it's next drawn. */
    private stale = false;

    constructor(
        private readonly motion: ExerciseMotion,
        private readonly figure: BodyFigure
    ) {
        this.texture.colorSpace = SRGBColorSpace;
        this.texture.anisotropy = 4;
        this.body = buildBody(figure);
        this.model = this.body.model;
        const part = (geometry: BufferGeometry) => {
            const mesh = this.mesh(geometry, this.bodyMaterial);
            mesh.matrixAutoUpdate = false;
            return mesh;
        };
        const body = this.body;
        this.parts = {
            torso: part(body.torso),
            neck: part(body.neck),
            head: part(body.head),
            upperArms: body.upperArms.map(part),
            forearms: body.forearms.map(part),
            hands: body.hands.map(part),
            thighs: body.thighs.map(part),
            shins: body.shins.map(part),
            feet: body.feet.map(part),
        };
        this.torsoRest = {
            position: (body.torso.getAttribute('position').array as Float32Array).slice(),
            normal: (body.torso.getAttribute('normal').array as Float32Array).slice(),
        };

        const joints = motionJoints(motion);
        const kitPoints = this.buildKit();
        const all = [...joints, ...kitPoints];
        const xs = all.map((point) => point[0]);
        const ys = all.map((point) => point[1]);
        const zs = all.map((point) => point[2]);
        const [minY, maxY] = [0, Math.max(...ys) + 4];
        const middle: Vec3 = [
            (Math.min(...xs) + Math.max(...xs)) / 2,
            (minY + maxY) / 2,
            (Math.min(...zs) + Math.max(...zs)) / 2,
        ];
        // Round the upright line through the middle, so turning it never takes it out of view
        const radius =
            Math.max(
                ...all.map((point) => Math.hypot(point[0] - middle[0], point[2] - middle[2]))
            ) + 8;
        const height = maxY - minY + 12;
        this.aspect = Math.min(2, Math.max(0.8, (2 * radius) / height));
        this.target = v(middle);
        this.radius = radius;
        this.height = height;
        this.camera = new PerspectiveCamera(28, this.aspect, 10, 4000);

        this.buildFloor(middle, radius);
        this.buildCarried();
        this.light(radius);
    }

    /**
     * The theme's colours, and which muscles the exercise works, main and supporting, to shade.
     * Painted before the figure's next drawn, and only if they've changed: painting is slow.
     */
    setLook({ colors, main, supporting }: FigureLook) {
        const same =
            this.colors !== null &&
            JSON.stringify([this.colors, this.main, this.supporting]) ===
                JSON.stringify([colors, main, supporting]);
        if (same) {
            return;
        }
        this.colors = colors;
        this.main = main;
        this.supporting = supporting;
        const outline = over(colors.outline, colors.page);
        (this.outline.uniforms['color'].value as Color).copy(outline);
        this.kitMaterial.color = over(colors.other, colors.page);
        this.metalMaterial.color = over(colors.metal, colors.page);
        this.floorMaterial.color = outline;
        this.stale = true;
    }

    /** Paints the figure if its look has changed since it last was. */
    paintIfStale() {
        if (this.stale) {
            this.stale = false;
            this.paint();
        }
    }

    /**
     * Draws the figure in `pose`, turned `yaw` degrees round from the way it's first seen,
     * onto `canvas` (a 2D one), filling it. False if it couldn't be drawn.
     */
    draw(pose: Pose, yaw: number, canvas: HTMLCanvasElement): boolean {
        const gl = sharedRenderer();
        const context = canvas.getContext('2d');
        if (!gl || !context || canvas.width === 0 || canvas.height === 0) {
            return false;
        }
        this.paintIfStale();
        this.place(skeletonOf(pose, this.motion));
        const distance = this.aim(yaw, canvas.width / canvas.height);
        // The outline as thick as the body map's lines, however big the canvas is
        const visible = 2 * distance * Math.tan(((this.camera.fov / 2) * Math.PI) / 180);
        const pixelsPerCm = canvas.height / visible;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.outline.uniforms['thickness'].value = (OUTLINE_PX * ratio) / pixelsPerCm;
        gl.setSize(canvas.width, canvas.height, false);
        gl.render(this.scene, this.camera);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(gl.domElement, 0, 0);
        return true;
    }

    dispose() {
        this.owned.forEach((thing) => thing.dispose());
        this.texture.dispose();
        [
            this.bodyMaterial,
            this.kitMaterial,
            this.metalMaterial,
            this.outline,
            this.floorMaterial,
            this.shadowMaterial,
        ].forEach((material) => material.dispose());
    }

    /** Paints the body map's drawings onto the figure, its muscles shaded for this exercise. */
    private paint() {
        const colors = this.colors;
        if (!colors) {
            return;
        }
        paintDrawings(this.painting, this.figure, colors, (muscle) =>
            muscleTone(muscle, this.main, this.supporting)
        );
        this.texture.needsUpdate = true;
    }

    /**
     * Where the camera is: as the motion says (`seenFrom`), turned `yaw` further, looking a
     * little down. Returns how far it is from what it looks at.
     */
    private aim(yaw: number, aspect: number): number {
        // Near enough to fill the canvas, whichever way round it's turned
        const camera = this.camera;
        const tan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
        const distance =
            Math.max(this.height / 2 / tan, this.radius / (tan * aspect)) + this.radius * 0.25;
        camera.aspect = aspect;
        camera.far = distance * 4;
        camera.updateProjectionMatrix();
        const start = this.motion.seenFrom ?? (this.motion.view === 'side' ? 60 : 25);
        const round = ((start + yaw) * Math.PI) / 180;
        const down = (10 * Math.PI) / 180;
        const offset = new Vector3(
            Math.cos(round) * Math.cos(down),
            Math.sin(down),
            Math.sin(round) * Math.cos(down)
        ).multiplyScalar(distance);
        camera.position.copy(this.target).add(offset);
        camera.lookAt(this.target);
        return distance;
    }

    /** A light from above, only to cast a soft shadow: the figure itself is flat, as the body map is. */
    private light(radius: number) {
        const key = new DirectionalLight(0xffffff, 1);
        key.position.copy(this.target).add(new Vector3(60, 400, 90));
        key.target.position.copy(this.target);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        const reach = radius + 60;
        Object.assign(key.shadow.camera, {
            left: -reach,
            right: reach,
            top: reach,
            bottom: -reach,
        });
        key.shadow.camera.far = 800;
        key.shadow.bias = -0.0005;
        this.scene.add(key, key.target);
    }

    /** A floor line round the figure, as the flat demo's, and its shadow on it. */
    private buildFloor(middle: Vec3, radius: number) {
        const ring = new RingGeometry(radius + 10, radius + 10.6, 96).rotateX(-Math.PI / 2);
        this.owned.push(ring);
        const floor = new Mesh(ring, this.floorMaterial);
        floor.position.set(middle[0], 0, middle[2]);
        const disc = new RingGeometry(0, radius + 10, 96).rotateX(-Math.PI / 2);
        this.owned.push(disc);
        const shadow = new Mesh(disc, this.shadowMaterial);
        shadow.position.set(middle[0], 0.05, middle[2]);
        shadow.receiveShadow = true;
        this.scene.add(floor, shadow);
    }

    /**
     * A mesh of `geometry`, kept to be disposed of, in the scene or in `into`, outlined as the
     * body map's shapes are unless it's a thin rod or cable.
     */
    private mesh(
        geometry: BufferGeometry,
        material: Material,
        into: Object3D = this.scene,
        outlined = material !== this.metalMaterial
    ) {
        this.owned.push(geometry);
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        if (outlined) {
            mesh.add(new Mesh(geometry, this.outline));
        }
        into.add(mesh);
        return mesh;
    }

    /** A rod of `radius` from `from` to `to`. */
    private rod(from: Vec3, to: Vec3, radius: number, material: Material) {
        const length = length3(sub3(to, from));
        const rod = this.mesh(new CylinderGeometry(radius, radius, length, 16), material);
        rod.position.copy(v(add3(from, scale3(sub3(to, from), 0.5))));
        orient(rod, sub3(to, from), [1, 0, 0]);
        return rod;
    }

    /**
     * The kit that stays put, placed from the drawing: out of it, a bench is 30 wide, a box 40,
     * and a frame's posts are on either side. Returns the points it reaches, to fit the view.
     * A landmine and a cable's bar go where the hands are, so are placed with the figure.
     */
    private buildKit(): Vec3[] {
        const view = this.motion.view;
        const kit = this.motion.kit ?? [];
        const lift = ([x, y]: readonly [number, number], depth = 0): Vec3 =>
            view === 'side' ? [x, -y, depth] : [depth, -y, -x];
        const depthAxis: Vec3 = view === 'side' ? [0, 0, 1] : [1, 0, 0];
        const seated = kit.some((piece) => piece.kind === 'pad' || piece.kind === 'block');
        const postsApart = seated ? 12 : 50;
        const points: Vec3[] = [];
        for (const piece of kit) {
            // Moved to the figure's left, which is -z from either view
            const aside: Vec3 = [0, 0, -('aside' in piece ? (piece.aside ?? 0) : 0)];
            if (piece.kind === 'pad' || piece.kind === 'block') {
                const [from, to] = [add3(lift(piece.from), aside), add3(lift(piece.to), aside)];
                const width = piece.kind === 'pad' ? 30 : 40;
                const along = sub3(to, from);
                if (piece.kind === 'pad') {
                    // A cushion 7 thick along its line, square to the drawing
                    const pad = this.mesh(
                        new BoxGeometry(length3(along), 7, width),
                        this.kitMaterial
                    );
                    pad.position.copy(v(add3(from, scale3(along, 0.5))));
                    const way = normalize3(along);
                    pad.quaternion.setFromRotationMatrix(
                        new Matrix4().makeBasis(v(way), v(cross3(depthAxis, way)), v(depthAxis))
                    );
                } else {
                    const [x, y, z] = along.map(Math.abs);
                    const shape =
                        view === 'side'
                            ? new BoxGeometry(x, y, width)
                            : new BoxGeometry(width, y, z);
                    this.mesh(shape, this.kitMaterial).position.copy(
                        v(add3(from, scale3(along, 0.5)))
                    );
                }
                points.push(
                    add3(from, scale3(depthAxis, width / 2)),
                    add3(to, scale3(depthAxis, -width / 2))
                );
            } else if (piece.kind === 'frame') {
                for (const depth of [-postsApart, postsApart]) {
                    this.rod(
                        add3(lift(piece.from, depth), aside),
                        add3(lift(piece.to, depth), aside),
                        1.6,
                        this.metalMaterial
                    );
                }
                points.push(
                    add3(lift(piece.from, postsApart), aside),
                    add3(lift(piece.to, -postsApart), aside)
                );
            } else if (piece.kind === 'bar') {
                const [from, to] = [lift(piece.at, -55), lift(piece.at, 55)];
                this.rod(from, to, 1.8, this.metalMaterial);
                points.push(from, to);
            } else if (piece.kind === 'bars') {
                // Either side, running front to back, each on a post at its back end. The figure
                // faces +x, its right +z, from either view
                for (const side of [-1, 1]) {
                    const middle = add3(lift(piece.at), [0, 0, (side * piece.apart) / 2]);
                    const [front, back] = [add3(middle, [30, 0, 0]), add3(middle, [-30, 0, 0])];
                    this.rod(back, front, 1.8, this.metalMaterial);
                    this.rod(back, [back[0], 0, back[2]], 1.6, this.metalMaterial);
                    points.push(front, back);
                }
            } else if (piece.kind === 'landmine') {
                // From its pivot on the floor through the middle of the hands, a plate beyond them
                const pivot = lift(piece.at);
                this.mesh(new SphereGeometry(3, 16, 12), this.kitMaterial).position.copy(v(pivot));
                const bar = this.mesh(new CylinderGeometry(1.6, 1.6, 1, 16), this.metalMaterial);
                const plate = this.mesh(new CylinderGeometry(15, 15, 5, 40), this.kitMaterial);
                this.carried.push((skeleton) => {
                    const hands = scale3(add3(skeleton.arms[0].end, skeleton.arms[1].end), 0.5);
                    const way = normalize3(sub3(hands, pivot));
                    const end = add3(hands, scale3(way, 24));
                    bar.scale.set(1, length3(sub3(end, pivot)), 1);
                    bar.position.copy(v(scale3(add3(pivot, end), 0.5)));
                    orient(bar, way, [1, 0, 0]);
                    plate.position.copy(v(add3(hands, scale3(way, 16))));
                    orient(plate, way, [1, 0, 0]);
                });
                points.push(pivot);
            } else {
                const from = lift(piece.from);
                /** A pulley and its cable, run to the hand `handOf` picks each pose. */
                const cableTo = (handOf: (hands: readonly Vec3[]) => Vec3) => {
                    const pulley = this.mesh(new SphereGeometry(3.5, 16, 12), this.kitMaterial);
                    const cable = this.mesh(
                        new CylinderGeometry(0.5, 0.5, 1, 8),
                        this.metalMaterial
                    );
                    this.carried.push((skeleton) => {
                        const hand = handOf(skeleton.arms.map((arm) => arm.end));
                        // The pulley in line with the hand it runs to
                        const at = add3(from, scale3(depthAxis, dot3(hand, depthAxis)));
                        pulley.position.copy(v(at));
                        const along = sub3(hand, at);
                        cable.scale.set(1, length3(along), 1);
                        cable.position.copy(v(add3(at, scale3(along, 0.5))));
                        orient(cable, along, [1, 0, 0]);
                    });
                };
                if (piece.each) {
                    cableTo((hands) => hands[0]);
                    cableTo((hands) => hands[1]);
                } else if (piece.bar) {
                    // To the middle of a bar held in both hands, through them and beyond
                    const long = piece.bar;
                    const bar = this.mesh(
                        new CylinderGeometry(1.3, 1.3, long, 12),
                        this.metalMaterial
                    );
                    cableTo((hands) => scale3(add3(hands[0], hands[1]), 0.5));
                    this.carried.push((skeleton) => {
                        const [a, b] = [skeleton.arms[0].end, skeleton.arms[1].end];
                        bar.position.copy(v(scale3(add3(a, b), 0.5)));
                        const across = sub3(a, b);
                        orient(bar, length3(across) < 4 ? skeleton.right : across, [1, 0, 0]);
                    });
                } else {
                    // The nearer hand, as drawn
                    const flat = (point: Vec3) =>
                        length3(sub3(sub3(point, scale3(depthAxis, dot3(point, depthAxis))), from));
                    cableTo((hands) => (flat(hands[0]) <= flat(hands[1]) ? hands[0] : hands[1]));
                }
                points.push(from);
            }
        }
        return points;
    }

    /** The kit the figure carries, each piece placed with it in every pose. */
    private buildCarried() {
        const props = new Set(this.motion.props ?? []);
        const barbell = () => {
            const group = new Group();
            this.mesh(new CylinderGeometry(1.6, 1.6, 124, 16), this.metalMaterial, group);
            for (const y of [-52, 52]) {
                const plate = this.mesh(
                    new CylinderGeometry(17, 17, 6, 40),
                    this.kitMaterial,
                    group
                );
                plate.position.y = y;
            }
            this.scene.add(group);
            return group;
        };
        const dumbbell = () => {
            const group = new Group();
            this.mesh(new CylinderGeometry(1.5, 1.5, 16, 12), this.metalMaterial, group);
            for (const y of [-8, 8]) {
                const head = this.mesh(
                    new CylinderGeometry(6.5, 6.5, 5, 6),
                    this.kitMaterial,
                    group
                );
                head.position.y = y;
            }
            this.scene.add(group);
            return group;
        };
        /**
         * The way a dumbbell's handle lies in the hand: across the forearm, side to side, or
         * turned palms in (`Pose.palmsIn`), square to the forearm and to the sides.
         */
        const grip = (skeleton: Skeleton, arm: Limb3) => {
            const forearm = normalize3(sub3(arm.end, arm.mid));
            const across = square(
                skeleton.right,
                forearm,
                square(skeleton.forward, forearm, [0, 1, 0])
            );
            if (!skeleton.palmsIn) {
                return across;
            }
            const facing = cross3(forearm, skeleton.right);
            const palmsIn = length3(facing) > 0.1 ? normalize3(facing) : skeleton.forward;
            return normalize3(
                add3(scale3(across, 1 - skeleton.palmsIn), scale3(palmsIn, skeleton.palmsIn))
            );
        };
        const handsMiddle = (skeleton: Skeleton) =>
            scale3(add3(skeleton.arms[0].end, skeleton.arms[1].end), 0.5);

        if (props.has('barbell-on-back') || props.has('barbell')) {
            const bar = barbell();
            const onBack = props.has('barbell-on-back');
            this.carried.push((skeleton) => {
                bar.position.copy(v(onBack ? skeleton.bar : handsMiddle(skeleton)));
                const across = sub3(skeleton.arms[0].end, skeleton.arms[1].end);
                orient(bar, onBack || length3(across) < 10 ? skeleton.right : across, skeleton.up);
            });
        }
        if (props.has('dumbbells') || props.has('dumbbell')) {
            const count = props.has('dumbbells') ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const bell = dumbbell();
                this.carried.push((skeleton) => {
                    const arm = skeleton.arms[i];
                    bell.position.copy(v(arm.end));
                    orient(bell, grip(skeleton, arm), sub3(arm.end, arm.mid));
                });
            }
        }
        if (props.has('kettlebell') || props.has('kettlebells')) {
            const kettlebell = () => {
                const bell = new Group();
                const ball = this.mesh(new SphereGeometry(8, 24, 16), this.kitMaterial, bell);
                ball.position.y = -11;
                const handle = this.mesh(
                    new TorusGeometry(4.5, 1.1, 8, 24),
                    this.metalMaterial,
                    bell
                );
                handle.position.y = -2;
                this.scene.add(bell);
                return bell;
            };
            const smooth = (t: number) => {
                const clamped = Math.min(1, Math.max(0, t));
                return clamped * clamped * (3 - 2 * clamped);
            };
            /**
             * The way the bell is from its handle in `arm`'s hand: hanging, swung out a little
             * along the forearm, or, with the forearm pointing up (racked, pressed), resting on
             * the back of it, out to the side and a little in front, clear of the arm and body.
             */
            const fromHand = (skeleton: Skeleton, arm: Limb3): Vec3 => {
                const along = normalize3(sub3(arm.end, arm.mid));
                const hang = normalize3(add3(scale3(along, 0.6), [0, -1, 0]));
                const outwards = add3(
                    scale3(skeleton.right, 0.8 * arm.side),
                    scale3(skeleton.forward, 0.6)
                );
                const rest = normalize3(
                    add3(scale3(along, -0.35), square(outwards, along, skeleton.forward))
                );
                const up = smooth((along[1] + 0.1) / 0.5);
                return normalize3(add3(scale3(hang, 1 - up), scale3(rest, up)));
            };
            if (props.has('kettlebells')) {
                for (const i of [0, 1]) {
                    const bell = kettlebell();
                    this.carried.push((skeleton) => {
                        const arm = skeleton.arms[i];
                        bell.position.copy(v(arm.end));
                        orient(bell, scale3(fromHand(skeleton, arm), -1), skeleton.right);
                    });
                }
            } else {
                const bell = kettlebell();
                this.carried.push((skeleton) => {
                    bell.position.copy(v(skeleton.bell));
                    if (skeleton.bellDown) {
                        // Standing on the floor
                        orient(bell, [0, 1, 0], skeleton.right);
                        return;
                    }
                    // In one hand, or held in both, between them, hanging straight down
                    const [near, far] = skeleton.arms;
                    const share = skeleton.heldBy;
                    const oneHand = normalize3(
                        add3(
                            scale3(fromHand(skeleton, near), 1 - share),
                            scale3(fromHand(skeleton, far), share)
                        )
                    );
                    const both = smooth(1 - Math.abs(share - 0.5) / 0.3);
                    const way = normalize3(add3(scale3(oneHand, 1 - both), [0, -both, 0]));
                    orient(bell, scale3(way, -1), skeleton.right);
                });
            }
        }
        if (props.has('ab-wheel')) {
            const wheel = new Group();
            this.mesh(new CylinderGeometry(10, 10, 6, 32), this.kitMaterial, wheel);
            this.mesh(new CylinderGeometry(1.4, 1.4, 34, 12), this.metalMaterial, wheel);
            this.scene.add(wheel);
            this.carried.push((skeleton) => {
                wheel.position.copy(v(handsMiddle(skeleton)));
                orient(wheel, skeleton.right, [1, 0, 0]);
            });
        }
        if (props.has('band')) {
            const band = this.mesh(new CylinderGeometry(1, 1, 1, 10), this.kitMaterial);
            this.carried.push((skeleton) => {
                const [a, b] = [skeleton.arms[0].end, skeleton.arms[1].end];
                band.scale.set(1, Math.max(length3(sub3(b, a)), 0.1), 1);
                band.position.copy(v(scale3(add3(a, b), 0.5)));
                orient(band, sub3(b, a), [1, 0, 0]);
            });
        }
        if (props.has('roller-on-shins') || props.has('roller-behind-ankles')) {
            const roller = this.mesh(new CylinderGeometry(5, 5, 36, 24), this.kitMaterial);
            const front = props.has('roller-on-shins') ? 1 : -1;
            this.carried.push((skeleton) => {
                const leg = skeleton.legs[0];
                const shin = normalize3(sub3(leg.end, leg.mid));
                const ahead = square(skeleton.forward, shin, [1, 0, 0]);
                const at = add3(
                    add3(leg.mid, scale3(shin, BODY.shin - 8)),
                    scale3(ahead, front * 9)
                );
                // Across both legs
                roller.position.copy(
                    v(
                        sub3(
                            at,
                            scale3(skeleton.right, dot3(sub3(at, skeleton.hips), skeleton.right))
                        )
                    )
                );
                orient(roller, skeleton.right, [1, 0, 0]);
            });
        }
        if (props.has('pad-on-knees')) {
            const pad = this.mesh(new BoxGeometry(40, 7, 22), this.kitMaterial);
            this.carried.push((skeleton) => {
                const leg = skeleton.legs[0];
                const thigh = normalize3(sub3(leg.mid, leg.root));
                const top = square(skeleton.up, thigh, [0, 1, 0]);
                // On top of both thighs, its front edge at the knees
                const at = add3(add3(leg.mid, scale3(thigh, -11)), scale3(top, 11));
                pad.position.copy(
                    v(
                        sub3(
                            at,
                            scale3(skeleton.right, dot3(sub3(at, skeleton.hips), skeleton.right))
                        )
                    )
                );
                // Across the legs (x), its top up (y), along the thighs (z)
                orient(pad, top, thigh);
            });
        }
        if (props.has('foot-plate')) {
            const plate = this.mesh(new BoxGeometry(50, 4, 40), this.kitMaterial);
            this.carried.push((skeleton) => {
                const leg = skeleton.legs[0];
                const foot = skeleton.feet[0];
                const sole = square(sub3(leg.end, leg.mid), foot, [0, -1, 0]);
                const middle = add3(add3(leg.end, scale3(foot, 7)), scale3(sole, 6));
                plate.position.copy(
                    v(
                        sub3(
                            middle,
                            scale3(
                                skeleton.right,
                                dot3(sub3(middle, skeleton.hips), skeleton.right)
                            )
                        )
                    )
                );
                orient(plate, sole, foot);
            });
        }
    }

    /** Puts every part where the skeleton says. */
    private place(skeleton: Skeleton) {
        const model = this.model;
        const { up, hips } = skeleton;
        const parts = this.parts;
        // The hips and legs face the way the body does; the chest, arms and head turn with a twist
        const bodyForward = rotateAbout(skeleton.forward, [0, 0, 0], up, -skeleton.twist);
        const bodyRight = rotateAbout(skeleton.right, [0, 0, 0], up, -skeleton.twist);
        const still: [Vec3, Vec3, Vec3] = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ];

        // The torso, stretched so its shoulders are where the skeleton's arms hang from
        const restHipY = model.joints.hip[1];
        const [shoulderZ, shoulderY] = model.joints.shoulder;
        const tall = (BODY.torso - 4) / (shoulderY - restHipY);
        // How far each thigh is bent forwards at the hip, from hanging straight down. A thigh
        // out to the side counts as hanging, however high, so a wide squat's knees, above the
        // hips, don't fold the seat away as a knee raised to the chest would
        const bent = skeleton.legs.map((leg) => {
            const thigh = normalize3(sub3(leg.mid, leg.root));
            const down = -dot3(thigh, up) + Math.abs(dot3(thigh, bodyRight));
            const degrees = (Math.atan2(dot3(thigh, bodyForward), down) * 180) / Math.PI;
            return Math.min(140, Math.max(-40, degrees));
        }) as [number, number];
        this.shapeTorso(skeleton.twist, bent, restHipY, model.levels.armpit);
        parts.torso.matrix.copy(
            moveMatrix(
                [0, restHipY, 0],
                still,
                hips,
                [bodyForward, up, bodyRight],
                [1, tall, SHOULDER_SPREAD / shoulderZ]
            )
        );

        const face = square(skeleton.forward, skeleton.headUp, skeleton.forward);
        const headFrame = frame(skeleton.headUp, face);
        const neckAt = add3(hips, scale3(up, (model.levels.neckBase - restHipY) * tall));
        parts.neck.matrix.copy(moveMatrix([0, model.levels.neckBase, 0], still, neckAt, headFrame));
        const headAt = add3(
            neckAt,
            scale3(skeleton.headUp, model.levels.chin - model.levels.neckBase)
        );
        parts.head.matrix.copy(moveMatrix([0, model.levels.chin, 0], still, headAt, headFrame));

        skeleton.arms.forEach((arm, i) => {
            const { forward, right } = skeleton;
            // At rest an arm hangs a little forwards and out, its front facing forwards: carried
            // from there, its front never flips over, short of reaching up behind the back
            const pivot = normalize3(
                add3(add3(scale3(up, -1), scale3(forward, 0.5)), scale3(right, 0.25 * arm.side))
            );
            const shoulder = restJoint(model, 'shoulder', arm.side);
            const elbow = restJoint(model, 'elbow', arm.side);
            const hand = restHand(model, arm.side);
            this.placeLimb(
                [parts.upperArms[i], parts.forearms[i], parts.hands[i]],
                [shoulder, elbow, hand],
                arm,
                [BODY.upperArm, BODY.forearm],
                { forward, up, right },
                pivot
            );
        });
        skeleton.legs.forEach((leg, i) => {
            const pivot = normalize3(add3(scale3(up, -1), scale3(bodyForward, 0.3)));
            const side = leg.side;
            const shinFront = this.placeLimb(
                [parts.thighs[i], parts.shins[i]],
                [
                    restJoint(model, 'hip', side),
                    restJoint(model, 'knee', side),
                    restJoint(model, 'ankle', side),
                ],
                leg,
                [BODY.thigh, BODY.shin],
                { forward: bodyForward, up, right: bodyRight },
                pivot
            );
            const foot = skeleton.feet[i];
            // The top of the foot faces up the shin, or, with the foot pointed in line with it
            // (kneeling), the way the front of the shin does
            const top = square(
                add3(normalize3(sub3(leg.mid, leg.end)), scale3(shinFront, 0.5)),
                foot,
                up
            );
            parts.feet[i].matrix.copy(
                moveMatrix([0, 0, 0], still, leg.end, [foot, top, cross3(foot, top)])
            );
        });
        this.carried.forEach((placeIt) => placeIt(skeleton));
    }

    /**
     * Places a limb's parts from where they are at rest (`rest`: its three joints) onto the
     * skeleton's, each stretched to the skeleton's length. The way each part's front faces is
     * carried, by the least turn, from where the limb points at `pivot`, so it never flips
     * over as the limb moves, short of pointing the opposite way to `pivot`. Returns the way
     * the front of its lower part faces.
     */
    private placeLimb(
        meshes: readonly Mesh[],
        rest: readonly [Vec3, Vec3, Vec3],
        limb: Limb3,
        [upperLength, lowerLength]: readonly [number, number],
        axes: { forward: Vec3; up: Vec3; right: Vec3 },
        pivot: Vec3
    ): Vec3 {
        const [restRoot, restMid, restEnd] = rest;
        const restUpper = normalize3(sub3(restMid, restRoot));
        const restLower = normalize3(sub3(restEnd, restMid));
        const forwards: Vec3 = [1, 0, 0];
        const restLowerFront = carry(restUpper, restLower, forwards);
        // Where the limb points at rest, on the body as it is now
        const onBody = (way: Vec3) =>
            add3(
                add3(scale3(axes.forward, way[0]), scale3(axes.up, way[1])),
                scale3(axes.right, way[2])
            );
        const pivotFront = carry(onBody(restUpper), pivot, axes.forward);

        const upperWay = normalize3(sub3(limb.mid, limb.root));
        const lowerWay = normalize3(sub3(limb.end, limb.mid));
        const upperFront = carry(pivot, upperWay, pivotFront);
        const lowerFront = carry(upperWay, lowerWay, upperFront);
        meshes[0].matrix.copy(
            moveMatrix(
                restRoot,
                frame(restUpper, forwards),
                limb.root,
                frame(upperWay, upperFront),
                [1, upperLength / length3(sub3(restMid, restRoot)), 1]
            )
        );
        const lower = moveMatrix(
            restMid,
            frame(restLower, restLowerFront),
            limb.mid,
            frame(lowerWay, lowerFront),
            [1, lowerLength / length3(sub3(restEnd, restMid)), 1]
        );
        // The hand goes with the forearm
        meshes.slice(1).forEach((mesh) => mesh.matrix.copy(lower));
        return lowerFront;
    }

    /**
     * Shapes the torso for the pose. Its seat, below the hip joints, bends forwards with each
     * thigh (`bent`, right and left, in degrees) and flattens behind as the glutes stretch,
     * rather than sticking out behind a body bent over. Above the hips it turns by `twist`
     * degrees about its middle line, none at the hips and all of it from the armpits up, as a
     * back twists.
     */
    private shapeTorso(
        twist: number,
        bent: readonly [number, number],
        hipY: number,
        armpitY: number
    ) {
        const shapedFor = [twist, ...bent].map((value) => value.toFixed(1)).join();
        if (shapedFor === this.torsoShapedFor) {
            return;
        }
        this.torsoShapedFor = shapedFor;
        const geometry = this.parts.torso.geometry;
        const position = geometry.getAttribute('position');
        const normal = geometry.getAttribute('normal');
        const { position: restPosition, normal: restNormal } = this.torsoRest;
        const smooth = (t: number) => {
            const clamped = Math.min(1, Math.max(0, t));
            return clamped * clamped * (3 - 2 * clamped);
        };
        const point = new Vector3();
        const facing = new Vector3();
        for (let i = 0; i < position.count; i++) {
            point.fromArray(restPosition, i * 3);
            facing.fromArray(restNormal, i * 3);
            const y = point.y;

            // The seat: each side goes with its own thigh, blending across the middle
            const rightShare = smooth((point.z + 8) / 16);
            const hip = bent[0] * rightShare + bent[1] * (1 - rightShare);
            // Bending gradually, from above the hip joints to below the seat, so it stays round
            const seat = smooth((hipY + 10 - y) / 22) * 0.9;
            if (hip > 0 && point.x < 0) {
                // Flatter behind as the hip bends, around the glutes
                const glutes = smooth((hipY + 14 - y) / 8);
                point.x *= 1 - 0.4 * Math.min(1, hip / 100) * glutes;
            }
            if (seat > 0) {
                const angle = (hip * seat * Math.PI) / 180;
                const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
                // About the line across through the hip joints: positive brings it forwards
                const [x, down] = [point.x, point.y - hipY];
                point.set(x * cos - down * sin, hipY + x * sin + down * cos, point.z);
                facing.set(
                    facing.x * cos - facing.y * sin,
                    facing.x * sin + facing.y * cos,
                    facing.z
                );
            }

            const t = smooth((y - hipY) / (armpitY - hipY));
            if (t > 0 && twist) {
                const angle = (twist * t * Math.PI) / 180;
                const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
                point.set(point.x * cos + point.z * sin, point.y, -point.x * sin + point.z * cos);
                facing.set(
                    facing.x * cos + facing.z * sin,
                    facing.y,
                    -facing.x * sin + facing.z * cos
                );
            }
            position.setXYZ(i, point.x, point.y, point.z);
            normal.setXYZ(i, facing.x, facing.y, facing.z);
        }
        position.needsUpdate = true;
        normal.needsUpdate = true;
    }
}
