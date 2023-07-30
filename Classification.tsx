//@ts-nocheck
import React, { useEffect, useState } from 'react';
import CategoryTab from './CategoryTab';
import TreeView from './TreeView';
import Categories from './Categories';
import { useSelector, useDispatch, connect } from 'react-redux'
import { getOCROutput } from 'actions/drawingBoardActions';
import { IBankStatementFormList, IBucket, ICommonReducer, IDocumentReducer, IDrawingBoardReducer, IMultiDocClassifierReducer, INotifySnackbar, IReducer, IUiWorkflowReducer } from 'interfaces/commonInterfaces';
import { createContainerList } from 'utils/invoiceUtils';
import { setStateData } from 'actions/commonActions';
import { properties } from 'constants/properties';
import { PreProcessedTreeData } from './TreeUtility';
import { getDocumentCategoriesAndInstitutionNames, saveAutoOcrData, setAutoOcr, setClassificationData, setTemplateList } from 'actions/MultiDocClassifierActions';
import { IAutoOcrResponse, ITasks } from 'interfaces/tableDrawingInterfaces';
import './TreeView.scss'
import ClassifierUtilityButton from './ClassifierUtilityButton';
// import { IDocumentCategory } from 'interfaces/multiDocClassifierInterfaces';
import { IScreenTemplate } from 'interfaces/uiWorkFlowInterfaces';
import { NotificationType } from 'constants/notificationType';
import { NotificationSeverity } from 'constants/common';
import { hideNotification, showNotification } from 'actions/notificationActions';
import { messages } from 'constants/messages';

interface IProps {
  reducer: ICommonReducer,
  documentReducer: IDocumentReducer,
  drawingBoardReducer: IDrawingBoardReducer,
  uiWorkflowReducer: IUiWorkflowReducer,
  multiDocClassifierReducer: IMultiDocClassifierReducer,
  setStateData: (payload: object) => void,
}

const Classification: React.FC<IProps> = (props) => {
  const dispatch = useDispatch();

  useEffect(() => {
    let containerList: Array<IBankStatementFormList> = createContainerList(props.documentReducer, props.reducer);
    props.setStateData({
      formList: containerList,
      count: props.documentReducer.taskList.length,
      src: props.documentReducer.taskList[0].taskList ? props.documentReducer.taskList[0].taskList[0].sharedFileURI : props.documentReducer.taskList[0].sharedFileURI,
      perInstituteCount: props.documentReducer.taskList[0].length
    });
    props.drawingBoardReducer.autoOcrResponse.clear();
    props.drawingBoardReducer.parsedOcrOutput.clear();
    for (let i = 0; i < props.documentReducer.taskList.length; i++) {
      if (props.documentReducer.taskList[i].taskList) {
        for (let j = 0; j < props.documentReducer.taskList[i].taskList.length; j++) {
          if (props.documentReducer.taskList[i].taskList[j].isGroupParent) {
            if (props.documentReducer.taskList[i].taskList[j].extraParamMap.autoCuratedJSONFilePath !== "null") {
              let payload = {
                taskId: props.documentReducer.taskList[i].taskList[j].taskId,
                propertyName: properties.autoCuratedJSONFilePath,
              };
              dispatch(getOCROutput(payload));
            }
          }
        }
      } else {
        let taskElement = props.documentReducer.taskList[i];
        if (taskElement.isGroupParent) {
          if (taskElement.extraParamMap.autoCuratedJSONFilePath !== "null") {
            let payload = {
              taskId: taskElement.taskId,
              propertyName: properties.autoCuratedJSONFilePath,
            };
            dispatch(getOCROutput(payload));
          }
        }
      }
    }
    dispatch(getDocumentCategoriesAndInstitutionNames());

  }, []);

  let templateListResponse: Array<IScreenTemplate> = useSelector((state: IReducer) => state.uiWorkflowReducer.templatesList);
  // let documentCategories: Array<IDocumentCategory> = useSelector((state:IReducer) => state.multiDocClassifierReducer.documentCategories);
  const [autoOcrResponseArray, setAutoOcrResponseArray] = useState<Array<IAutoOcrResponse>>([]);

  const getAutoOcrResponseArray = () => {
    let autoOcrResponseArray: Array<IAutoOcrResponse> = [];
    props.drawingBoardReducer.autoOcrResponse.forEach((eachElement: IAutoOcrResponse) => {
      autoOcrResponseArray.push(eachElement);
    });
    return (autoOcrResponseArray)
  }

  useEffect(() => {
    let autoOcrResponseArray: Array<IAutoOcrResponse> = getAutoOcrResponseArray();
    console.log("autoOcrResponseArray", autoOcrResponseArray);
    dispatch(setAutoOcr(autoOcrResponseArray));
    let templateList: Array<string> = templateListResponse.map(eachTemplate => {
      return eachTemplate.templateName.split('_').join(' ');
    })
    dispatch(setTemplateList(templateList));
  }, [props.drawingBoardReducer.autoOcrResponse, templateListResponse]);

  useEffect(() => {
    const autoOcrResponse: Array<IAutoOcrResponse> = props.multiDocClassifierReducer.autoOcrResponse;


    let buckets: Array<IBucket> = [];
    autoOcrResponse?.forEach((e: any) => {
      buckets.push(...e.buckets)
    });

    let taskData: Array<ITasks> = []
    autoOcrResponse?.forEach((e: any) => taskData.push(...e.tasks));
    let preProcessedData = PreProcessedTreeData(buckets, taskData)

    dispatch(setClassificationData(preProcessedData));
    setAutoOcrResponseArray(autoOcrResponse)
  }, [props.multiDocClassifierReducer.autoOcrResponse])

  const handleSaveData = () => {
    let payload = {
      mergedOcrData: autoOcrResponseArray[0],
      taskId: getParentTaskId(),
      propertyName: properties.autoCuratedJSONFilePath
    }
    dispatch(saveAutoOcrData(payload, successCallBack))
  }

  const getParentTaskId = () => {
    let parentTaskId = -1;
    let task = props.documentReducer.taskList.find((task: any) => task.isParent);
    return task !== undefined ? task.taskId : props.documentReducer.taskList[0].taskId;
  }

  const successCallBack = () => {
    showCustomSnackbar(messages['data.saved.succesfully'])
  }

  const showCustomSnackbar = (message: string) => {
    dispatch(showNotification(NotificationType.CUSTOM_SNACKBAR, {
      message: message,
      handleClose: () => dispatch(hideNotification()),
      severity: NotificationSeverity.SUCCESS
    } as INotifySnackbar))
  }

  return (
    <div
      className='Classification-Root-Container'
      style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
      <div style={{
        flex: "13",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100vh",
        gap: "10px"
      }}>
        <div style={{ height: "81vh" }}>
          <CategoryTab />
        </div>
        <div style={{ height: "10vh" }}>
          <Categories />
        </div>
      </div>

      <div style={{ width: "500px", marginRight: "-50px" }}>
        <TreeView />
        <ClassifierUtilityButton
          validateData={() => { isEveryFormFieldValidated() }}
          jumpToNextError={() => { }}
          saveData={() => { handleSaveData() }}
          errorNavigationRequired={true}
        />
      </div>

    </div>
  );
}

const mapStateToProps = (state: any) => ({
  reducer: state.reducer,
  documentReducer: state.documentReducer,
  drawingBoardReducer: state.drawingBoardReducer,
  uiWorkflowReducer: state.uiWorkflowReducer,
  multiDocClassifierReducer: state.multiDocClassifierReducer
})

const mapDispatchToProps = (dispatch: any) => ({
  setStateData: (payload: object) => {
    dispatch(setStateData(payload))
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Classification)
