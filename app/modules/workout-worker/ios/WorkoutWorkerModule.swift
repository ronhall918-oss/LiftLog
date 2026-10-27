import ExpoModulesCore

public class WorkoutWorkerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WorkoutWorker")


    Events("on")


    Function("broadcast") { (jsonString: String) in

    }

    // iOS rest notifications sound once, so there is nothing to silence.
    Function("silenceRestAlarm") {}

    // Android only: iOS has no public API for starting a Clock app timer.
    Function("startClockTimer") { (seconds: Int, message: String) in }
  }
}
