import {
  CourseManager,
  type CourseHole,
  type CourseSummary
} from "../../components/courses/course-manager";
import { EmptyState, PageHeader } from "../../components/ui/primitives";
import {
  requireTeamStaff,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";

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

async function getCoursesData(
  currentTeam: CurrentTeamContext
): Promise<CoursesState> {
  try {
    const { supabase, team } = currentTeam;

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
  const currentTeam = await requireTeamStaff();
  const coursesData = await getCoursesData(currentTeam);

  if (coursesData.status === "error") {
    return (
      <section className="space-y-6">
        <CoursesHeader />
        <EmptyState title="Courses unavailable" message={coursesData.message} />
      </section>
    );
  }

  if (coursesData.status === "empty") {
    return (
      <section className="space-y-6">
        <CoursesHeader />
        <EmptyState message={coursesData.message} />
      </section>
    );
  }

  return <CourseManager courses={coursesData.courses} />;
}

function CoursesHeader() {
  return (
    <PageHeader
      eyebrow="Course Setup"
      title="Courses"
      description="Course setup will be available after team data is loaded."
    />
  );
}
