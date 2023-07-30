import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import _ from 'lodash';
import classNames from 'classnames';
import { FormControlLabel, Paper, Switch } from '@material-ui/core';
import OtherDrawingBoardContainer from 'components/OtherTaskTypeComponents/DrawingUiComponents/OtherDrawingBoardContainer';
import KeyValuePairComponent from 'components/DrawingBoardComponent/KeyValuePairsComponent/KeyValuePairComponent';
import FormFieldsErrorModal from 'components/common/FormFieldsErrorModal/FormFieldsErrorModal';
import ClassifierUtilityButton from 'containers/MultiDocClassifierContainer/ClassifierUtilityButton';
import { checkAndGetTemplateValues, getSuitableFormDirectories } from 'utils/templateUtils';
import { getNextScreenNameAndIndex, getPreviousScreenNameAndIndex, validateFormFields } from 'utils/commonUtils';
import { getConfidenceMapInfo } from 'utils/drawingBoardUtils';
import { clusteriseAutoOcrOutput, parseOcrOutput } from 'utils/parseOcrOutput';
import { updateCurrentScreenInfo } from 'actions/uiWorkFlowActions';
import { setStateData } from 'actions/commonActions';
import { setSelectedBucket, updateValidationArray } from 'actions/clusteringActions';
import { actionTypes } from 'constants/actionTypes';
import { getOCROutput, saveDataInfo } from 'actions/drawingBoardActions';
import { ICommonReducer, IDrawingBoardReducer, IDocumentReducer, IUpdatedScreenInfo, IUiWorkflowReducer, nextPreviousCallBack, IDrawingUIConfigs, IClusteringReducer, IBucket } from 'interfaces/commonInterfaces';
import { IAutoOcrResponse, ICleanedBoundingBox, ICommonWordsMapValues, IConfidenceMapValues, IKeyValueFormFields, IPageWiseFormFields, IParsedOcrOutput, IStringWithLocusInfo, ITasks, ITaskWiseFormFields, IWordsData, IWordToCellMapValue } from 'interfaces/tableDrawingInterfaces';
import { IScreenTemplate, IScreenTemplateValues } from 'interfaces/uiWorkFlowInterfaces';
import { messages } from 'constants/messages';
import { TemplateTypesEnum } from 'constants/templateConstants';
import { properties } from 'constants/properties';
import './extraction.scss';

interface IProps {
  divDisabled: boolean,
  updateScreenStatus: (nextState: string, startStatus: boolean) => void;
  displayIgnoreDocument?: boolean;
  isDocIgnoredCheckbox?: () => boolean;
  handleisDocIgnored?: () => void;
  drawingUIConfigurations: IDrawingUIConfigs,
  customConfigurations?: any,
  updateSubmitButton: Function,
}
interface IMapStateToProps {
  reducer: ICommonReducer;
  drawingBoardReducer: IDrawingBoardReducer,
  documentReducer: IDocumentReducer,
  uiWorkflowReducer: IUiWorkflowReducer,
  clusteringReducer: IClusteringReducer,
}

interface IMatchDispatchToProps {
  setStateData: (payload: object) => void;
  updateCurrentScreenInfo: (payload: IUpdatedScreenInfo) => void;
  setSelectedBucket: (payload: number) => void;
}

const Extraction: React.FC<IProps & IMapStateToProps & IMatchDispatchToProps> = (props) => {
  const [parsedOcrOutputData, setParsedOcrOutputData] = useState([] as Array<IParsedOcrOutput>);
  const [currentPage, setCurrentPage] = useState(0 as number);
  const [currentTask, setCurrentTask] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [, setConfidenceMap] = useState([] as Array<Map<string, IConfidenceMapValues>>);
  const [, setWordsToCellMap] = useState(new Map<string, IWordToCellMapValue>([]) as Map<string, IWordToCellMapValue>);
  const [, setArePagesPresent] = useState(true as boolean);
  const [, setCommonWordsMap] = useState(new Map([]) as Map<string, ICommonWordsMapValues>)
  const [confidence, setConfidence] = useState([] as Array<Array<Array<IConfidenceMapValues>>>);
  const [, setWordsMap] = useState(new Map([]) as Map<string, IWordsData>);
  const [formFieldsData, setFormFieldsData] = useState([] as Array<ITaskWiseFormFields>)
  const [isRhsFullScreen,] = useState(false as boolean);
  const [isToggleViewChecked, setIsToggleViewChecked] = useState(true as boolean);
  const [showToolbar, setShowToolbar] = useState(true as boolean);
  const [wordBoundingBoxes,] = useState([] as Array<ICleanedBoundingBox>);
  const [nextButtonError, setNextButtonError] = useState({ isOkToProceed: true, message: "" } as nextPreviousCallBack);
  const [showErrorModel, setShowErrorModal] = useState(true as boolean);
  const [newPageNo, setNewPageNo] = useState(0 as number);
  const [isValidationPassed, setIsValidationPassed] = useState(false as boolean);
  const [isDisabled, setIsDisabled] = useState(false as boolean);
  const [errorTitle, setErrorTitle] = useState("" as string);

  let dispatch = useDispatch();

  useEffect(() => {
    setCurrentGroup(props.documentReducer.selectedDocument - 1);
    setCurrentTask(props.documentReducer.selectedStatement - 1);
    setCurrentPage(0);
  }, [props.documentReducer.selectedStatement, props.documentReducer.selectedDocument]);

  useEffect(() => {
    for (let i = 0; i < props.documentReducer.taskList.length; i++) {
      if (props.documentReducer.taskList[i].isGroupParent) {
        if (props.documentReducer.taskList[i].extraParamMap.autoCuratedJSONFilePath !== "null") {
          const payload = {
            taskId: props.documentReducer.taskList[props.documentReducer.selectedDocument - 1].taskId,
            propertyName: properties.autoCuratedJSONFilePath,
            updateStatus: false
          };
          dispatch(getOCROutput(payload, undefined, successCallBack, true));
        }
      }
    }
    successCallBack();
  }, [props.documentReducer.selectedDocument])

  useEffect(() => {
    let parsedOcrOutput: Array<IParsedOcrOutput> = [];
    if (props.drawingBoardReducer?.parsedOcrOutput) {
      props.drawingBoardReducer.parsedOcrOutput.forEach((eachElement: IParsedOcrOutput) => {
        parsedOcrOutput.push(eachElement);
      });
      setParsedOcrOutputData(parsedOcrOutput);
    }
  }, [props.drawingBoardReducer.parsedOcrOutput])

  useEffect(() => {
    if (parsedOcrOutputData[props.documentReducer.selectedDocument - 1]) {
      let confidenceAndMapInfo = getConfidenceMapInfo(parsedOcrOutputData[props.documentReducer.selectedDocument - 1]?.properties?.[currentTask]?.[currentPage], parsedOcrOutputData[props.documentReducer.selectedDocument - 1]?.confidence?.[currentTask]?.[currentPage])
      setConfidenceMap(confidenceAndMapInfo.confidenceMapList);
      setWordsToCellMap(confidenceAndMapInfo.wordToCellMap)
    }
  }, [confidence]);

  useEffect(() => {
    if (props.drawingUIConfigurations.drawingBoardContainer?.allowFormFieldChangeOnPageChange) {
      setNewPageNo(currentPage);
    } else {
      setNewPageNo(0);
    }
  }, [currentPage]);

  useEffect(() => {
    if (props.drawingBoardReducer?.parsedOcrOutput?.size && props.clusteringReducer?.clusteredAutoOcrOutput?.size) {
      let parsedOcrOutput: Array<IParsedOcrOutput> = [];
      if (props.drawingBoardReducer?.parsedOcrOutput) {

        props.drawingBoardReducer.parsedOcrOutput.forEach((eachElement: IParsedOcrOutput) => {
          parsedOcrOutput.push(eachElement);
        });

        if (parsedOcrOutput[props.documentReducer.selectedDocument - 1]) {
          setCommonWordsMap(parsedOcrOutput[props.documentReducer.selectedDocument - 1]?.commonWordsMap);
          setWordsMap(parsedOcrOutput[props.documentReducer.selectedDocument - 1]?.wordsList[props.documentReducer.selectedStatement - 1]?.[currentPage]);
          setConfidence(parsedOcrOutput[props.documentReducer.selectedDocument - 1]?.confidence[props.documentReducer.selectedStatement - 1]?.[currentPage]);
        }
        if (parsedOcrOutput[props.documentReducer.selectedDocument - 1].formFieldsData) {
          setFormFieldsData(parsedOcrOutput[props.documentReducer.selectedDocument - 1].formFieldsData);
        }
      }
    }

  }, [props.drawingBoardReducer.parsedOcrOutput, props.documentReducer.selectedStatement, props.documentReducer.selectedDocument, currentPage]);

  const getAutoOcrResponseArray = () => {
    let autoOcrResponse: Array<IAutoOcrResponse> = [];
    props.clusteringReducer.clusteredAutoOcrOutput.forEach((eachElement: IAutoOcrResponse) => {
      autoOcrResponse.push(eachElement);
    });
    return (autoOcrResponse)
  }

  useEffect(() => {
    if (props?.clusteringReducer?.clusteredAutoOcrOutput?.size) {
      let autoOcrResponse: Array<IAutoOcrResponse> = getAutoOcrResponseArray();
      if (autoOcrResponse[props.documentReducer.selectedDocument - 1] && autoOcrResponse[props.documentReducer.selectedDocument - 1]?.tasks[currentTask]) {
        let arePagesPresentFlag = true;
        for (let i = 0; i < autoOcrResponse[props.documentReducer.selectedDocument - 1]?.tasks[currentTask]?.pages?.length; i++) {
          if (_.isEmpty(autoOcrResponse[props.documentReducer.selectedDocument - 1].tasks[currentTask].pages[i].filePath)) {
            arePagesPresentFlag = false
            break;
          }
        }
        arePagesPresentFlag ? setArePagesPresent(false) : setArePagesPresent(true);
      }
    }
  }, [props.clusteringReducer.clusteredAutoOcrOutput, currentTask, props.documentReducer.selectedDocument - 1])

  useEffect(() => {
    props.divDisabled ? setShowToolbar(false) : setShowToolbar(true);

  }, [props.divDisabled])

  useEffect(() => {
    dispatch(updateValidationArray(isValidationPassed && props.drawingBoardReducer.isDataSaved));
  }, [props.drawingBoardReducer.isDataSaved, isValidationPassed])

  useEffect(() => {
    props.updateSubmitButton() && props.updateSubmitButton();
  }, [props.clusteringReducer.bucketValidationIndicator])

  useEffect(() => {
    getIsDisabled();
  }, [props.divDisabled, props.documentReducer.selectedStatement])

  const getIsDisabled = () => {
    let templateDocTypeList: Array<IScreenTemplate> | undefined = props.uiWorkflowReducer.templatesList?.filter((template: IScreenTemplate) => template.templateName !== "IRRELEVANT");
    let templateDocTypeNameList: Array<string> | undefined = templateDocTypeList?.map((template: IScreenTemplate) => { return template.templateName; });
    let currentBucketName: string = props.clusteringReducer?.buckets[props.documentReducer.selectedStatement - 1]?.name;
    let currentBucketNameList: Array<string> = currentBucketName.split(".");
    let isDisabled: boolean = currentBucketName.includes("IRRELEVANT") ? true : currentBucketNameList.some((name: string) => templateDocTypeNameList?.includes(name));
    setIsDisabled(isDisabled);
    setShowToolbar(isDisabled);
  }

  const successCallBack = () => {
    let groupParentTaskId = 0;
    let originalTasks: Array<ITasks> = [];
    props.drawingBoardReducer.autoOcrResponse.forEach((value: IAutoOcrResponse) => {
      if (groupParentTaskId === 0) {
        groupParentTaskId = value.tasks[0].taskId;
        originalTasks = value.tasks;
      }
    })
    let clusterisedAutoOcrOutput: any = clusteriseAutoOcrOutput(originalTasks, props.clusteringReducer.buckets);
    const action = {
      type: actionTypes.UPDATE_CLUSTERING_INFO,
      payload: {
        clusteredAutoOcrOutput: clusterisedAutoOcrOutput,
        groupParentTaskId: groupParentTaskId
      }
    };
    dispatch(action)
    const action2 = { type: actionTypes.SET_PARSED_OCR_OUTPUT, payload: parseOcrOutput(clusterisedAutoOcrOutput, groupParentTaskId) };
    //@ts-ignore
    dispatch(action2);
  }


  // const getWordBoundingBoxes = (wordBoundingBoxes: Array<ICleanedBoundingBox>) => {
  //   setWordBoundingBoxes(wordBoundingBoxes);
  // };

  const getCurrentPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  }

  const getRhsView = () => {
    return (
      props.drawingUIConfigurations.keyValueComponent?.isRequired &&
      <KeyValuePairComponent
        formFieldsData={formFieldsData}
        currentTask={currentTask}
        currentPage={newPageNo}
        currentGroup={currentGroup}
        selectedWordId={props.drawingBoardReducer.selectedWordId}
        isWordClickedOn={props.drawingBoardReducer.isBoundingBoxClicked}
        enableAllFunctionalities={!props.divDisabled && isDisabled}
        {...props.drawingUIConfigurations.keyValueComponent}

      />)
  }

  const updateStatus = () => {
    let newState = props?.uiWorkflowReducer?.screens[props.uiWorkflowReducer.currentScreenIndex]?.state?.end;
    props.updateScreenStatus(newState, false);
  }
  const nextButtonOperation = () => {
    updateStatus();
    props.setStateData({
      selectedStatement: 1,
      selectedDocument: 1
    })
    let updatedScreenInfo = getNextScreenNameAndIndex(props.uiWorkflowReducer);
    props.updateCurrentScreenInfo(updatedScreenInfo);
  }

  const previousButtonOperation = () => {
    updateStatus();
    props.setStateData({
      selectedStatement: 1,
      selectedDocument: 1
    })
    let updatedScreenInfo = getPreviousScreenNameAndIndex(props.uiWorkflowReducer);
    props.updateCurrentScreenInfo(updatedScreenInfo);
  }

  const nextButtonDisableStatus = () => {
    let isInLastAccount = currentGroup === props.drawingBoardReducer.parsedOcrOutput.size - 1;
    let isNotNextScreenAvailable = props.uiWorkflowReducer.screens.find(screen => screen.screenName === props.uiWorkflowReducer.currentScreenName)?.link.next.length === 0;
    return (isScreenDisabled() ? true : isInLastAccount && isNotNextScreenAvailable);
  }

  const prevButtonDisableStatus = () => {
    let isNotPreviousScreenAvailable = props.uiWorkflowReducer.screens.find(screen => screen.screenName === props.uiWorkflowReducer.currentScreenName)?.link.previous.length === 0;
    return (props.divDisabled && isNotPreviousScreenAvailable);
  }

  const switchViews = () => {
    setIsToggleViewChecked(!isToggleViewChecked);
  }

  const isToggleButtonRequired = () => {
    return (props.drawingUIConfigurations.jExcelComponent.isRequired && props.drawingUIConfigurations.keyValueComponent?.isRequired)
  }
  const getJexcelAndKeyValueToggleButton = () => {
    const switchLabel: string = messages["jss.keyValue.toggle.button.label"]
    if (isToggleButtonRequired()) {
      return (
        <FormControlLabel
          value="start"
          control={
            <Switch
              checked={isToggleViewChecked}
              onChange={switchViews}
              name="checkedB"
              color="primary"
            />}
          label={switchLabel}
          labelPlacement="start"
        />)
    }
    else return <></>
  }

  const isEveryFormFieldValidated = (bucket: IBucket, bucketIndex: number) => {
    // Create maps for evaluation
    const formFieldsMap: Map<string, Array<IStringWithLocusInfo>> = new Map();
    const templateFields: Array<IScreenTemplateValues> = checkAndGetTemplateValues(getSuitableFormDirectories(props.uiWorkflowReducer, bucket), TemplateTypesEnum.FORM_FIELD);
    //template fields map
    const templateFieldsMap = new Map(templateFields.map(i => [i.id, i]));
    //formFields map
    const taskFormFields = props.drawingBoardReducer?.formFieldsData[currentGroup]?.taskWiseFormFields[bucketIndex];
    if (taskFormFields.pageWiseFormFields) {
      let pageFormFields: IPageWiseFormFields = taskFormFields.pageWiseFormFields[0];
      pageFormFields?.formFields.forEach((formField: IKeyValueFormFields) => {
        if (formField?.fieldName?.nodeId && formField.fieldName.nodeId !== "") {
          formFieldsMap.get(formField.fieldName.nodeId) === undefined ?
            formFieldsMap.set(formField.fieldName.nodeId, [{ data: formField.fieldValue.dpaText.dpCorrected, formField: formField, groupNumber: currentGroup, taskNumber: bucketIndex, pageNumber: 0 }])
            : formFieldsMap.set(formField.fieldName.nodeId, [...formFieldsMap.get(formField.fieldName.nodeId)!, { data: formField.fieldValue.dpaText.dpCorrected, formField: formField, groupNumber: currentGroup, taskNumber: bucketIndex, pageNumber: 0 }]);
        }
      })
    }
    return validateFormFields(formFieldsMap, templateFieldsMap);
  }

  const validateFormFieldsForEachBucket = () => {
    let validationResult: nextPreviousCallBack = { isOkToProceed: true, message: "" };
    let errorBucketName: string = "";
    for (let i = 0; i < props.clusteringReducer.buckets.length; i++) {
      let bucket: IBucket = props.clusteringReducer.buckets[i];
      validationResult = isEveryFormFieldValidated(bucket, i);
      console.log(validationResult);
      if (!validationResult.isOkToProceed) {
        errorBucketName = props.clusteringReducer.buckets[i].name;
        break;
      }
    }
    if (!validationResult.isOkToProceed) {
      setErrorTitle(" in " + errorBucketName);
      nextButtonErrorModal(validationResult);
    }
    setIsValidationPassed(validationResult.isOkToProceed);
    dispatch(saveDataInfo(false));
  }

  const nextButtonErrorModal = (resultOfCallBack: nextPreviousCallBack,) => {
    setShowErrorModal(true);
    setNextButtonError(resultOfCallBack);
  }

  const isScreenDisabled = () => {
    return (props.isDocIgnoredCheckbox && props.isDocIgnoredCheckbox() ? true : props.divDisabled)
  }

  return (
    <div className="extraction-container " id="extraction-container-id">
      <Paper id="drawing-board-reducer-toggle-view-checked" className={classNames({
        "col-6": !props.drawingBoardReducer.isCanvasFullScreen && !isToggleViewChecked,
        "col-8": !props.drawingBoardReducer.isCanvasFullScreen && isToggleViewChecked,
        "left": true,
        "no-display": isRhsFullScreen,
        "full-display": props.drawingBoardReducer.isCanvasFullScreen,
        "overflow": "hidden",
        "is-disabled": props.divDisabled,
      })}>
        <OtherDrawingBoardContainer
          setCurrentPage={getCurrentPage}
          isToggleViewChecked={isToggleViewChecked}
          enableAllFunctionalities={!props.divDisabled && isDisabled}
          showToolbar={showToolbar}
          wordBoundingBoxes={wordBoundingBoxes}
          multiKeyValueView={isToggleViewChecked}
          divDisabled={true}
          customConfigurations={props.customConfigurations}
          {...props.drawingUIConfigurations.drawingBoardContainer}
        />
      </Paper>
      <Paper id="rhs-full-screen-toggle-view-checked" className={classNames({
        "col-6": !isRhsFullScreen && !isToggleViewChecked,
        "col-4": !isRhsFullScreen && isToggleViewChecked,
        "no-display": props.drawingBoardReducer.isCanvasFullScreen,
        "full-display": isRhsFullScreen
      })}>
        <div>{props.clusteringReducer.buckets[props.documentReducer.selectedStatement - 1].name}</div>
        {getJexcelAndKeyValueToggleButton()}
        <div className="right-scroll" id="right-scroll-pointer-events-screen-disabled"
          style={isScreenDisabled() ? { pointerEvents: "none", opacity: "0.4" } : {}}
        >
          {getRhsView()}
        </div>
        {!nextButtonError.isOkToProceed && <FormFieldsErrorModal
          title={messages["alert.error.title"] + errorTitle}
          formFieldsErrors={nextButtonError.errors}
          open={showErrorModel}
          handleClose={(closeValue: boolean) => { setShowErrorModal(closeValue) }}
        />}
        <ClassifierUtilityButton
          validateData={validateFormFieldsForEachBucket}
          errorNavigationRequired={false}
          prevButtonDisableStatus={prevButtonDisableStatus()}
          previousButtonOperation={previousButtonOperation}
          nextButtonDisableStatus={nextButtonDisableStatus()}
          nextButtonOperation={nextButtonOperation}
        />
      </Paper>
    </div>
  )
}


const mapStateToProps = (state: IMapStateToProps) => ({
  reducer: state.reducer,
  drawingBoardReducer: state.drawingBoardReducer,
  documentReducer: state.documentReducer,
  uiWorkflowReducer: state.uiWorkflowReducer,
  clusteringReducer: state.clusteringReducer
});

const mapDispatchToProps = (dispatch: any) => ({
  updateCurrentScreenInfo: (payload: IUpdatedScreenInfo) => {
    dispatch(updateCurrentScreenInfo(payload))
  },
  setStateData: (payload: object) => {
    dispatch(setStateData(payload));
  },
  setSelectedBucket: (payload: number) => {
    dispatch(setSelectedBucket(payload));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Extraction);
