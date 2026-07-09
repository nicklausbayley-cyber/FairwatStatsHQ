import {
  CourseManager,
  type CourseHole,
  type CourseSummary
} from "../../components/courses/course-manager";
import { createServiceRoleClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

type CourseRow = {
  id: string;
  name: string;
  location: string | null;
};

type CourseHoleRow = {
  course_id: string;
  hole_number: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

type CoursesState =
  | {
      status: "ready";
      courses: CourseSummary[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function getCoursesData(): Promise<CoursesState> {
  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return { status: "error", message: teamError.message };
    }

    if (!team) {
      return {
        status: "empty",
        message: "No team found. Run the demo seed file before adding courses."
      };
    }

    const { data: coursesData, error: coursesError } = await supabase
      .from("courses")
      .select("id, name, location")
      .eq("team_id", team.id)
      .order("name", { ascending: true });

    if (coursesError) {
      return { status: "error", message: coursesError.message };
    }

    const courses = (coursesData ?? []) as CourseRow[];
    const courseIds = courses.map((course) => course.id);
    let courseHoles: CourseHoleRow[] = [];

    if (courseIds.length > 0) {
      const { data: holesData, error: holesError } = await supabase
        .from("course_holes")
        .select("course_id, hole_number, par, handicap, yardage")
        .in("course_id", courseIds)
        .order("hole_number", { ascending: true });

      if (holesError) {
        return { status: "error", message: holesError.message };
      }

      courseHoles = (holesData ?? []) as CourseHoleRow[];
    }

    const holesByCourse = new Map<string, CourseHole[]>();

    courseHoles.forEach((hole) => {
      const holes = holesByCourse.get(hole.course_id) ?? [];
      holes.push({
        holeNumber: hole.hole_number,
        par: hole.par,
        handicap: hole.handicap,
        yardage: hole.yardage
      });
      holesByCourse.set(hole.course_id, holes);
    });

    return {
      status: "ready",
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        location: course.location,
        holes: holesByCourse.get(course.id) ?? []
      }))
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load course data."
    };
  }
}

export default async function CoursesPage() {
  const coursesData = await getCoursesData();

  if (coursesData.status === "error") {
    return (
      <section className="space-y-6">
        <CoursesHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Courses unavailable</p>
          <p className="mt-1">{coursesData.message}</p>
        </div>
      </section>
    );
  }

  if (coursesData.status === "empty") {
    return (
      <section className="space-y-6">
        <CoursesHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {coursesData.message}
        </div>
      </section>
    );
  }

  return <CourseManager courses={coursesData.courses} />;
}

function CoursesHeader() {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Course Setup
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
        Courses
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
        Course setup will be available after team data is loaded.
      </p>
    </div>
  );
}
