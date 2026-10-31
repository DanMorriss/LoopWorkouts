import {
    AmbientLight,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry,
    CircleGeometry,
    Color,
    CylinderGeometry,
    DirectionalLight,
    Group,
    HemisphereLight,
    LatheGeometry,
    Material,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Object3D,
    CanvasTexture,
    PCFShadowMap,
    PerspectiveCamera,
    Quaternion,
    Scene,
    ShadowMaterial,
    SphereGeometry,
    SRGBColorSpace,
    TorusGeometry,
    Vector2,
    Vector3,
    WebGLRenderer,
} from 'three';
import { MuscleGroup } from '../../../models/exercise';
import {
    BODY,
    ExerciseMotion,
    muscleTone,
    MuscleTone,
    Pose,
} from '../../../models/exercise-motion';
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
    Skeleton,
    skeletonOf,
    sub3,
    Vec3,
} from '../../../models/exercise-skeleton';

/**
 * The 3D figure of an exercise's demo (EXR-13), drawn with three.js: a smooth jointed body,
 * each muscle on it shaded as on the body map, with its kit, on a floor. Loaded only when a
 * demo is shown. See `exercise-skeleton.ts` for how it's posed.
 */

/** The page's colours to draw with, as CSS colours. */
export interface FigureColors {
    readonly main: string;
    readonly supporting: string;
    readonly idle: string;
    readonly other: string;
    /** The body map's outline, mixed into the unworked muscles so the figure stands out. */
    readonly outline: string;
    /** Bars and other metal. */
    readonly metal: string;
    readonly floor: string;
}

/** Where muscle groups are on each part, by which way its surface faces. */
type Classify = (normal: Vector3, at: Vector3) => MuscleGroup | null;

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
    const xAxis = cross3(yAxis, zAxis);
    object.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(v(xAxis), v(yAxis), v(zAxis)));
}

/**
 * A body part's shape, with which muscle each face of it is, so it can be shaded face by face
 * with crisp edges between muscles.
 */
class PartGeometry {
    readonly geometry: BufferGeometry;
    private readonly muscles: (MuscleGroup | null)[] = [];

    constructor(shape: BufferGeometry, classify: Classify) {
        shape.computeVertexNormals();
        const geometry = shape.index ? shape.toNonIndexed() : shape;
        const position = geometry.getAttribute('position');
        const normal = geometry.getAttribute('normal');
        const centre = new Vector3();
        const facing = new Vector3();
        for (let face = 0; face < position.count / 3; face++) {
            centre.set(0, 0, 0);
            facing.set(0, 0, 0);
            for (let corner = 0; corner < 3; corner++) {
                const i = face * 3 + corner;
                centre.add(new Vector3().fromBufferAttribute(position, i));
                facing.add(new Vector3().fromBufferAttribute(normal, i));
            }
            this.muscles.push(classify(facing.normalize(), centre.divideScalar(3)));
        }
        geometry.setAttribute(
            'color',
            new BufferAttribute(new Float32Array(position.count * 3), 3)
        );
        this.geometry = geometry;
    }

    paint(colourOf: (muscle: MuscleGroup | null) => Color) {
        const colour = this.geometry.getAttribute('color') as BufferAttribute;
        this.muscles.forEach((muscle, face) => {
            const { r, g, b } = colourOf(muscle);
            for (let corner = 0; corner < 3; corner++) {
                colour.setXYZ(face * 3 + corner, r, g, b);
            }
        });
        colour.needsUpdate = true;
    }
}

/**
 * A limb's part, along +y from its joint (0) to `length`, rounded at each end, `from` thick at
 * the joint and `to` at the other end. Its front faces +z.
 */
function limbShape(length: number, from: number, to: number): BufferGeometry {
    const points: Vector2[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
        const angle = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
        points.push(new Vector2(from * Math.cos(angle) + 1e-3, from * Math.sin(angle)));
    }
    const rows = Math.ceil(length / 2);
    for (let i = 1; i < rows; i++) {
        const t = i / rows;
        points.push(new Vector2(from + (to - from) * t, length * t));
    }
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * (Math.PI / 2);
        points.push(new Vector2(to * Math.cos(angle) + 1e-3, length + to * Math.sin(angle)));
    }
    return new LatheGeometry(points, 32);
}

/** An egg shape, `x` by `y` by `z` across (its half-widths). */
function ellipsoid(x: number, y: number, z: number): BufferGeometry {
    return new SphereGeometry(1, 40, 28).scale(x, y, z);
}

/**
 * How far round a limb a face is, from its front (0) towards its outer side (90) or its inner
 * side (-90), to its back (±180). `outward` is +1 when the limb's +x is its outer side.
 */
const roundLimb = (normal: Vector3, outward: number) =>
    (Math.atan2(normal.x * outward, normal.z) * 180) / Math.PI;

// Each limb part's muscles. A limb's +z is its front (where a thigh's quads are), and +x is its
// outer side on the right, its inner side on the left
const thigh =
    (outward: number): Classify =>
    (normal, at) => {
        const round = roundLimb(normal, outward);
        const t = at.y / BODY.thigh;
        if (t > 0.94) {
            return null; // the knee
        }
        if (Math.abs(round) < 55) {
            return 'quads';
        }
        if (Math.abs(round) > 125) {
            return t < 0.12 ? 'glutes' : 'hamstrings';
        }
        return round > 0 ? (t < 0.22 ? 'abductors' : 'quads') : 'adductors';
    };
const shin =
    (outward: number): Classify =>
    (normal, at) => {
        if (at.y < 1) {
            return null; // the knee
        }
        return Math.abs(roundLimb(normal, outward)) < 70 ? 'shins' : 'calves';
    };
const upperArm =
    (outward: number): Classify =>
    (normal, at) => {
        if (at.y < 5 && roundLimb(normal, outward) > -60) {
            return 'shoulders';
        }
        return Math.abs(roundLimb(normal, outward)) < 90 ? 'biceps' : 'triceps';
    };
const forearm: Classify = () => 'forearms';
const never: Classify = () => null;

// The torso's muscles. Its parts are in the body's axes: +x forwards, +y up the back, +z right
const chest: Classify = (normal, at) => {
    if (normal.x > 0.35) {
        return at.y > -7 ? 'chest' : 'abs';
    }
    if (normal.y > 0.55 || (normal.x < -0.3 && at.y > 8 && Math.abs(normal.z) < 0.5)) {
        return 'traps';
    }
    return 'upper-back';
};
const belly: Classify = (normal) =>
    normal.x > 0.45 ? 'abs' : normal.x < -0.35 ? 'lower-back' : 'obliques';
const pelvis: Classify = (normal, at) => {
    if (normal.x < -0.15) {
        return 'glutes';
    }
    if (Math.abs(normal.z) > 0.8 && at.y > -3) {
        return 'abductors';
    }
    return null;
};
const neck: Classify = (normal) => (normal.x < -0.4 ? 'traps' : 'neck');

/** The torso's three parts, up its back from the hips: their middles and half-widths. */
const PELVIS = { at: 4, size: [11, 11, 16] } as const;
const BELLY = { at: 20, size: [10, 12, 13.5] } as const;
const CHEST = { at: 37, size: [11.5, 16, 17] } as const;
/** From the elbow to the wrist; the hand fills the rest of the forearm's length. */
const WRIST = BODY.forearm - 4;

/** A limb's parts, the way the front of each faces carried along from the body's front. */
interface LimbMeshes {
    readonly upper: Mesh;
    readonly lower: Mesh;
    readonly end: Mesh;
}

/** One exercise's figure, its kit and floor, to draw in any pose from any way round. */
export class FigureScene {
    /** The width of the drawing over its height, at its best. */
    readonly aspect: number;

    private readonly scene = new Scene();
    private readonly camera: PerspectiveCamera;
    private readonly target: Vector3;
    /** How far the figure and its kit reach round the upright line through `target`. */
    private readonly radius: number;
    private readonly height: number;
    private readonly parts: PartGeometry[] = [];
    private readonly bodyMaterial = new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0,
    });
    private readonly kitMaterial = new MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 });
    private readonly metalMaterial = new MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 });
    private readonly floorMaterial = new MeshBasicMaterial({
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
    });
    private readonly shadowMaterial = new ShadowMaterial({ opacity: 0.3 });
    /** Geometry and textures made for it, to free with it. */
    private readonly owned: { dispose(): void }[] = [];

    private readonly torso: { pelvis: Mesh; belly: Mesh; chest: Mesh };
    private readonly neckMesh: Mesh;
    private readonly head: Mesh;
    private readonly nose: Mesh;
    private readonly shoulders: readonly [Mesh, Mesh];
    private readonly arms: readonly [LimbMeshes, LimbMeshes];
    private readonly legs: readonly [LimbMeshes, LimbMeshes];
    /** Kit that moves with the figure, placed each frame. */
    private readonly carried: ((skeleton: Skeleton) => void)[] = [];

    private main: readonly MuscleGroup[] = [];
    private supporting: readonly MuscleGroup[] = [];
    private colors: Record<MuscleTone, Color> | null = null;

    constructor(private readonly motion: ExerciseMotion) {
        const part = (shape: BufferGeometry, classify: Classify) => {
            const made = new PartGeometry(shape, classify);
            this.parts.push(made);
            this.owned.push(made.geometry);
            const mesh = new Mesh(made.geometry, this.bodyMaterial);
            mesh.castShadow = true;
            this.scene.add(mesh);
            return mesh;
        };
        this.torso = {
            pelvis: part(ellipsoid(...PELVIS.size), pelvis),
            belly: part(ellipsoid(...BELLY.size), belly),
            chest: part(ellipsoid(...CHEST.size), chest),
        };
        this.neckMesh = part(limbShape(12, 5.5, 5), neck);
        this.head = part(ellipsoid(9.5, 11.5, 8.5), never);
        this.nose = part(ellipsoid(2, 2.6, 1.8), never);
        this.shoulders = [
            part(ellipsoid(7, 7, 7), () => 'shoulders'),
            part(ellipsoid(7, 7, 7), () => 'shoulders'),
        ];
        // Index 0 is the figure's right, whose +x (outer side) is out; the left's is in
        const arm = (outward: number): LimbMeshes => ({
            upper: part(limbShape(BODY.upperArm, 5, 4), upperArm(outward)),
            lower: part(limbShape(WRIST, 4, 2.8), forearm),
            end: part(ellipsoid(2.4, 5, 4), never),
        });
        const leg = (outward: number): LimbMeshes => ({
            upper: part(limbShape(BODY.thigh, 8, 5.5), thigh(outward)),
            lower: part(limbShape(BODY.shin, 5.5, 3.6), shin(outward)),
            end: part(ellipsoid(4.6, 3.6, 13), never),
        });
        this.arms = [arm(1), arm(-1)];
        this.legs = [leg(1), leg(-1)];

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
            ) + 6;
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

    /** Which muscles the exercise works, main and supporting, to shade. */
    setMuscles(main: readonly MuscleGroup[], supporting: readonly MuscleGroup[]) {
        this.main = main;
        this.supporting = supporting;
        this.paint();
    }

    setColors(colors: FigureColors) {
        // Unworked, as near the page as the body map's are, they'd be lost without its
        // outlines, so they're mixed part way to the outline
        const outline = new Color(colors.outline);
        this.colors = {
            main: new Color(colors.main),
            supporting: new Color(colors.supporting),
            idle: new Color(colors.idle).lerp(outline, 0.45),
            other: new Color(colors.other).lerp(outline, 0.35),
        };
        this.kitMaterial.color = new Color(colors.other).lerp(outline, 0.2);
        this.metalMaterial.color = new Color(colors.metal);
        this.floorMaterial.color = new Color(colors.floor);
        this.paint();
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
        this.place(skeletonOf(pose, this.motion));
        this.aim(yaw, canvas.width / canvas.height);
        gl.setSize(canvas.width, canvas.height, false);
        gl.render(this.scene, this.camera);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(gl.domElement, 0, 0);
        return true;
    }

    dispose() {
        this.owned.forEach((thing) => thing.dispose());
        [
            this.bodyMaterial,
            this.kitMaterial,
            this.metalMaterial,
            this.floorMaterial,
            this.shadowMaterial,
        ].forEach((material) => material.dispose());
    }

    private paint() {
        const colors = this.colors;
        if (!colors) {
            return;
        }
        const colourOf = (muscle: MuscleGroup | null) =>
            colors[muscleTone(muscle, this.main, this.supporting)];
        this.parts.forEach((part) => part.paint(colourOf));
    }

    /**
     * Where the camera is: as the motion says (`seenFrom`), turned `yaw` further, looking a
     * little down.
     */
    private aim(yaw: number, aspect: number) {
        // Near enough to fill the canvas, whichever way round it's turned
        const camera = this.camera;
        const tan = Math.tan(((camera.fov / 2) * Math.PI) / 180);
        const distance =
            Math.max(this.height / 2 / tan, this.radius / (tan * aspect)) + this.radius * 0.6;
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
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }

    private light(radius: number) {
        this.scene.add(
            new HemisphereLight(0xffffff, 0x8090a0, 1.5),
            new AmbientLight(0xffffff, 0.35)
        );
        const key = new DirectionalLight(0xffffff, 2.2);
        key.position.copy(this.target).add(new Vector3(90, 400, 130));
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
        key.shadow.radius = 4;
        this.scene.add(key, key.target);
        const back = new DirectionalLight(0xffffff, 0.8);
        back.position.copy(this.target).add(new Vector3(-150, 120, -120));
        this.scene.add(back);
    }

    private buildFloor(middle: Vec3, radius: number) {
        const disc = new CircleGeometry(radius + 25, 64).rotateX(-Math.PI / 2);
        this.owned.push(disc);
        // Fading out towards its edge, so there's no hard edge to it
        const fade = document.createElement('canvas');
        fade.width = fade.height = 128;
        const context = fade.getContext('2d');
        if (context) {
            const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 128, 128);
        }
        const texture = new CanvasTexture(fade);
        this.floorMaterial.map = texture;
        this.floorMaterial.alphaMap = texture;
        this.owned.push(texture);
        const floor = new Mesh(disc, this.floorMaterial);
        floor.position.set(middle[0], -0.2, middle[2]);
        // Wider than the floor, so no shadow is cut off at its edge
        const wide = new CircleGeometry(radius + 80, 64).rotateX(-Math.PI / 2);
        this.owned.push(wide);
        const shadow = new Mesh(wide, this.shadowMaterial);
        shadow.position.set(middle[0], 0, middle[2]);
        shadow.receiveShadow = true;
        this.scene.add(floor, shadow);
    }

    /** A mesh of `geometry`, kept to be disposed of, in the scene or in `into`. */
    private mesh(geometry: BufferGeometry, material: Material, into: Object3D = this.scene) {
        this.owned.push(geometry);
        const mesh = new Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
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
            if (piece.kind === 'pad' || piece.kind === 'block') {
                const [from, to] = [lift(piece.from), lift(piece.to)];
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
                        lift(piece.from, depth),
                        lift(piece.to, depth),
                        1.6,
                        this.metalMaterial
                    );
                }
                points.push(lift(piece.from, postsApart), lift(piece.to, -postsApart));
            } else if (piece.kind === 'bar') {
                const [from, to] = [lift(piece.at, -55), lift(piece.at, 55)];
                this.rod(from, to, 1.8, this.metalMaterial);
                points.push(from, to);
            } else {
                const pulley = this.mesh(new SphereGeometry(3.5, 16, 12), this.kitMaterial);
                const cable = this.mesh(new CylinderGeometry(0.5, 0.5, 1, 8), this.metalMaterial);
                const from = lift(piece.from);
                this.carried.push((skeleton) => {
                    // The nearer hand, as drawn
                    const hands = skeleton.arms.map((arm) => arm.end);
                    const flat = (point: Vec3) =>
                        length3(sub3(sub3(point, scale3(depthAxis, dot3(point, depthAxis))), from));
                    const hand = flat(hands[0]) <= flat(hands[1]) ? hands[0] : hands[1];
                    // The pulley in line with the hand it runs to
                    const at = add3(from, scale3(depthAxis, dot3(hand, depthAxis)));
                    pulley.position.copy(v(at));
                    const along = sub3(hand, at);
                    cable.scale.set(1, length3(along), 1);
                    cable.position.copy(v(add3(at, scale3(along, 0.5))));
                    orient(cable, along, [1, 0, 0]);
                });
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
        /** The way a dumbbell's handle lies in the hand: across the forearm, side to side. */
        const grip = (skeleton: Skeleton, arm: Limb3) => {
            const forearm = normalize3(sub3(arm.end, arm.mid));
            return square(skeleton.right, forearm, square(skeleton.forward, forearm, [0, 1, 0]));
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
        if (props.has('kettlebell')) {
            const bell = new Group();
            const ball = this.mesh(new SphereGeometry(8, 24, 16), this.kitMaterial, bell);
            ball.position.y = -11;
            const handle = this.mesh(new TorusGeometry(4.5, 1.1, 8, 24), this.metalMaterial, bell);
            handle.position.y = -2;
            this.scene.add(bell);
            this.carried.push((skeleton) => {
                const arm = skeleton.arms[0];
                // Hanging from the hand, swung out a little along the forearm
                const along = normalize3(sub3(arm.end, arm.mid));
                const hang = normalize3(add3(scale3(along, 0.6), [0, -1, 0]));
                bell.position.copy(v(arm.end));
                orient(bell, scale3(hang, -1), skeleton.right);
            });
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
        const { up, hips } = skeleton;
        // The torso turns progressively up the back, by all of the twist at the chest
        const unturned = (way: Vec3) => rotateAbout(way, [0, 0, 0], up, -skeleton.twist);
        const bodyForward = unturned(skeleton.forward);
        const halfway = rotateAbout(bodyForward, [0, 0, 0], up, skeleton.twist / 2);
        const centre = (along: number) => v(add3(hips, scale3(up, along)));
        this.torso.pelvis.position.copy(centre(PELVIS.at));
        orient(this.torso.pelvis, up, cross3(bodyForward, up));
        this.torso.belly.position.copy(centre(BELLY.at));
        orient(this.torso.belly, up, cross3(halfway, up));
        this.torso.chest.position.copy(centre(CHEST.at));
        orient(this.torso.chest, up, skeleton.right);

        const neckBase = add3(skeleton.shoulders, scale3(up, -3));
        this.neckMesh.position.copy(v(neckBase));
        orient(this.neckMesh, sub3(skeleton.neck, neckBase), skeleton.forward);
        const headAt = add3(skeleton.neck, scale3(skeleton.headUp, 8));
        const face = square(skeleton.forward, skeleton.headUp, skeleton.forward);
        this.head.position.copy(v(headAt));
        orient(this.head, skeleton.headUp, cross3(face, skeleton.headUp));
        this.nose.position.copy(
            v(add3(add3(headAt, scale3(face, 9.2)), scale3(skeleton.headUp, -1)))
        );
        orient(this.nose, skeleton.headUp, cross3(face, skeleton.headUp));

        skeleton.arms.forEach((arm, i) => {
            this.shoulders[i].position.copy(v(arm.root));
            orient(this.shoulders[i], up, skeleton.right);
            // At rest an arm hangs a little forwards and out, its front facing forwards
            const rest = normalize3(
                add3(
                    add3(scale3(up, -1), scale3(skeleton.forward, 0.5)),
                    scale3(skeleton.right, 0.25 * arm.side)
                )
            );
            const front = this.placeLimb(
                this.arms[i],
                arm,
                rest,
                square(skeleton.forward, rest, skeleton.forward)
            );
            this.arms[i].end.position.copy(v(arm.end));
            orient(this.arms[i].end, sub3(arm.end, arm.mid), front);
        });
        skeleton.legs.forEach((leg, i) => {
            const rest = normalize3(add3(scale3(up, -1), scale3(bodyForward, 0.3)));
            this.placeLimb(this.legs[i], leg, rest, square(bodyForward, rest, bodyForward));
            const foot = skeleton.feet[i];
            const sole = square(sub3(leg.end, leg.mid), foot, [0, -1, 0]);
            const footMesh = this.legs[i].end;
            footMesh.position.copy(v(add3(add3(leg.end, scale3(foot, 8)), scale3(sole, 2))));
            orient(footMesh, scale3(sole, -1), foot);
        });
        this.carried.forEach((placeIt) => placeIt(skeleton));
    }

    /**
     * Places a limb's parts, returning the way the front of its lower part faces. The way each part's front faces is carried from `rest` (where the
     * limb's front faces `restFront`) by the least turn to where it points, so it never flips
     * over as the limb moves, short of pointing the opposite way to `rest`.
     */
    private placeLimb(meshes: LimbMeshes, limb: Limb3, rest: Vec3, restFront: Vec3): Vec3 {
        const upperWay = normalize3(sub3(limb.mid, limb.root));
        const lowerWay = normalize3(sub3(limb.end, limb.mid));
        const carry = (from: Vec3, to: Vec3, front: Vec3): Vec3 => {
            const turn = new Quaternion().setFromUnitVectors(v(from), v(to));
            const turned = v(front).applyQuaternion(turn);
            return [turned.x, turned.y, turned.z];
        };
        const upperFront = carry(rest, upperWay, restFront);
        const lowerFront = carry(upperWay, lowerWay, upperFront);
        meshes.upper.position.copy(v(limb.root));
        orient(meshes.upper, upperWay, upperFront);
        meshes.lower.position.copy(v(limb.mid));
        orient(meshes.lower, lowerWay, lowerFront);
        return lowerFront;
    }
}
