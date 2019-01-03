describe("Demo jobs", () => {
  describe("Connectivity job", () => {
    CONNECTIVITY_JOB_NORMAL_TIMEOUT = 300; // sec

    beforeEach(() =>
      jest.setTimeout((CONNECTIVITY_JOB_NORMAL_TIMEOUT + 10) * 1000)
    );

    it("builds successfully", async () => {
      await global.jenkins.buildAndWaitForSuccess(
        "test-connectivity-to-gl",
        CONNECTIVITY_JOB_NORMAL_TIMEOUT
      );
    });

    it("can't be built immediately", async () => {
      let error;
      try {
        await global.jenkins.buildAndWaitForSuccess(
          "test-connectivity-to-gl",
          1
        );
      } catch (e) {
        error = e;
      }
      expect(error).toEqual("timed out");
    });
  });
});
