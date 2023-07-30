//@ts-nocheck
import * as React from 'react';
import Classification from './Classification';
import { useState } from 'react';
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import { Box, Button, Grid, Step, StepLabel, Stepper, Typography } from '@material-ui/core';
import Extraction from './Extraction';

const steps = [<Classification />, <Extraction />];
const steptitle = ['CLASSIFICATION', 'EXTRACTION']

export default function MultiDocClassifierContainer() {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    alert("Finished All Steps")
    setActiveStep(0);
  };
  return (
    <Box>
      <div style={{ display: "flex", flexDirection: "row", padding: "8px" }}>
        <Grid style={{ display: "flex", alignContent: "center", justifyContent: "center", width: "80%" }}>
          <Stepper activeStep={activeStep} style={{ width: '60%', padding: 0 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="caption">{steptitle[index]}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Grid>
        <Grid style={{ display: "flex", alignContent: "center", justifyContent: "center", width: "20%", flexWrap: "wrap", columnGap: "10px" }}>
          <Button disabled={activeStep === 0} variant="contained" size="small" color="primary" style={{ width: "100px", height: "40px" }} startIcon={<NavigateBeforeIcon />} onClick={handleBack}>BACK</Button>
          {activeStep === steps.length - 1 ?
            <Button variant="contained" size="small" color="primary" style={{ width: "100px" }} onClick={handleReset}>FINISH</Button>
            :
            <Button variant="contained" size="small" color="primary" style={{ width: "100px" }} endIcon={<NavigateNextIcon />} onClick={handleNext}>NEXT</Button>
          }
        </Grid>
      </div>
      <div>
        <Typography>
          {steps[activeStep]}
        </Typography>
      </div>
    </Box>

  )
}
